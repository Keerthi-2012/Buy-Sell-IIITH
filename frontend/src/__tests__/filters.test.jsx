import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FilterCard } from '../components/FilterCard';
import BrowseItems from '../components/BrowseItems';
import { api } from '../utils/api';

// Only the network is replaced; categories and items come from here.
vi.mock('../utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  api: { get: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: url === '/item/categories' ? ['books', 'hostel_essentials'] : { items: [], total: 0, pages: 1 },
    })
  );
});

const books = () => screen.findByRole('checkbox', { name: 'Books' });
const hostel = () => screen.findByRole('checkbox', { name: 'Hostel essentials' });

describe('FilterCard', () => {
  it('lists the categories, none selected at first', async () => {
    render(<FilterCard onFilterChange={() => {}} />);
    expect(await books()).not.toBeChecked();
    expect(await hostel()).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('selects a category on click', async () => {
    const onFilterChange = vi.fn();
    render(<FilterCard onFilterChange={onFilterChange} />);
    await userEvent.click(await books());

    expect(onFilterChange).toHaveBeenLastCalledWith('category', 'books');
    expect(await books()).toBeChecked();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('switches the filter off when the selected category is clicked again', async () => {
    const onFilterChange = vi.fn();
    render(<FilterCard onFilterChange={onFilterChange} />);
    await userEvent.click(await books());
    await userEvent.click(await books());

    expect(onFilterChange).toHaveBeenLastCalledWith('category', '');
    expect(await books()).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('moves the selection when another category is clicked', async () => {
    const onFilterChange = vi.fn();
    render(<FilterCard onFilterChange={onFilterChange} />);
    await userEvent.click(await books());
    await userEvent.click(await hostel());

    expect(onFilterChange).toHaveBeenLastCalledWith('category', 'hostel_essentials');
    expect(await hostel()).toBeChecked();
    expect(await books()).not.toBeChecked();
  });

  it('the Clear link removes the filter', async () => {
    const onFilterChange = vi.fn();
    render(<FilterCard onFilterChange={onFilterChange} />);
    await userEvent.click(await books());
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onFilterChange).toHaveBeenLastCalledWith('category', '');
    expect(await books()).not.toBeChecked();
  });
});

describe('Browse page filtering', () => {
  const lastItemRequest = () => api.get.mock.calls.filter(([url]) => url === '/item').at(-1)[1].params;

  it('filters the results, then shows everything again when the filter is clicked off', async () => {
    render(
      <MemoryRouter>
        <BrowseItems />
      </MemoryRouter>
    );

    await waitFor(() => expect(lastItemRequest().category).toBe(''));

    await userEvent.click(await books());
    await waitFor(() => expect(lastItemRequest().category).toBe('books'));

    // the second click is the one that used to need a page refresh
    await userEvent.click(await books());
    await waitFor(() => expect(lastItemRequest().category).toBe(''));
    expect(await books()).not.toBeChecked();
  });
});
