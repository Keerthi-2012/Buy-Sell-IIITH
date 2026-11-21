import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import BrowseItems from '../components/BrowseItems';
import { api } from '../utils/api';

// Testing Library only notices Jest's fake timers; this tells it Vitest's are active too,
// otherwise its async helpers wait forever on a clock that never ticks.
globalThis.jest = { advanceTimersByTime: (ms) => vi.advanceTimersByTime(ms) };

// Only the network is replaced.
vi.mock('../utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  api: { get: vi.fn() },
}));

const item = (name) => ({ _id: name, name, price: 100, category: 'misc', quantity: 1, status: 'available' });
const page = (...names) => ({ data: { items: names.map(item), total: names.length, pages: 1 } });

// Shows the current URL query so tests can see what the page wrote there.
const Where = () => <p data-testid="where">{useLocation().search}</p>;

// Moves the fake clock forward inside act(), so React applies the state updates the timers cause.
const tick = (ms) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

// Every search term the page has asked the server for, in order.
const searches = () => api.get.mock.calls.filter(([url]) => url === '/item').map(([, cfg]) => cfg.params.search);
const lastSearch = () => searches().at(-1);

let user;
const box = () => screen.getByPlaceholderText(/search items/i);

const mount = (url = '/browseitems') => {
  render(
    <MemoryRouter initialEntries={[url]}>
      <BrowseItems />
      <Where />
    </MemoryRouter>
  );
  return tick(0); // let the first request settle
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  api.get.mockImplementation((url) =>
    Promise.resolve(url === '/item/categories' ? { data: [] } : page('Study Lamp', 'Desk Organizer'))
  );
});

afterEach(() => vi.useRealTimers());

describe('live search', () => {
  it('searches once typing pauses, not on every keystroke', async () => {
    await mount();
    await user.type(box(), 'lam');

    expect(searches()).not.toContain('l');
    expect(searches()).not.toContain('la');
    expect(searches()).not.toContain('lam'); // still inside the pause

    await tick(260);
    expect(lastSearch()).toBe('lam');
    expect(searches().filter((s) => s !== '')).toEqual(['lam']); // one request for the whole word
  });

  it('follows deletions too, all the way back to showing everything', async () => {
    await mount();
    await user.type(box(), 'lamp');
    await tick(260);
    expect(lastSearch()).toBe('lamp');

    await user.type(box(), '{backspace}{backspace}');
    await tick(260);
    expect(lastSearch()).toBe('la');

    await user.clear(box());
    await tick(260);
    expect(lastSearch()).toBe('');
  });

  it('searches straight away on Enter, without waiting for the pause', async () => {
    await mount();
    await user.type(box(), 'book{Enter}');
    await tick(0);
    expect(lastSearch()).toBe('book');
  });

  it('searches straight away when the magnifier is clicked', async () => {
    await mount();
    await user.type(box(), 'cycle');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await tick(0);
    expect(lastSearch()).toBe('cycle');
  });

  it('ignores spaces around the search text', async () => {
    await mount();
    await user.type(box(), '  lamp  ');
    await tick(260);
    expect(lastSearch()).toBe('lamp');
  });

  it('mirrors the search into the URL, and drops it again when the box is cleared', async () => {
    await mount();
    await user.type(box(), 'desk');
    await tick(260);
    expect(screen.getByTestId('where')).toHaveTextContent('?search=desk');

    await user.clear(box());
    await tick(260);
    expect(screen.getByTestId('where')).toHaveTextContent(/^$/);
  });

  it('does not overwrite what is being typed while an earlier search settles into the URL', async () => {
    await mount();
    await user.type(box(), 'ab');
    await tick(260); // "ab" is searched and written to the URL...
    await user.type(box(), 'c'); // ...and the user keeps typing straight away
    expect(box()).toHaveValue('abc');
    await tick(260);
    expect(box()).toHaveValue('abc');
    expect(lastSearch()).toBe('abc');
  });

  it('starts from the search in the URL', async () => {
    await mount('/browseitems?search=desk');
    expect(box()).toHaveValue('desk');
    expect(searches()[0]).toBe('desk');
  });

  it('keeps the old results on screen (dimmed) while new ones load', async () => {
    let release;
    api.get.mockImplementation((url, cfg) => {
      if (url === '/item/categories') return Promise.resolve({ data: [] });
      if (cfg.params.search === 'desk') {
        return new Promise((resolve) => {
          release = () => resolve(page('Desk Organizer'));
        });
      }
      return Promise.resolve(page('Study Lamp'));
    });

    await mount();
    expect(screen.getByText('Study Lamp')).toBeInTheDocument();

    await user.type(box(), 'desk');
    await tick(260);
    // the request for "desk" is in flight: the lamp is still shown, just dimmed
    expect(screen.getByText('Study Lamp')).toBeInTheDocument();
    expect(document.querySelector('.items-section.is-loading')).not.toBeNull();

    release();
    await tick(0);
    expect(screen.getByText('Desk Organizer')).toBeInTheDocument();
    expect(screen.queryByText('Study Lamp')).toBeNull();
    expect(document.querySelector('.items-section.is-loading')).toBeNull();
  });
});
