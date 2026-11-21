import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../redux/authslice';
import { useTabSync } from '../utils/useTabSync';

// Renders the hook in a store where `user` is logged in (or null), and returns the reload spy.
const setup = (user) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user, checkingSession: false } },
  });
  const reload = vi.fn();
  const view = renderHook(() => useTabSync(reload), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  return { reload, ...view };
};

// What the browser sends to *other* tabs when this site's localStorage changes.
const otherTabSets = (key, value) =>
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }));

describe('useTabSync', () => {
  it('reloads when another tab logs in as a different user', () => {
    const { reload } = setup({ _id: 'keerthi' });
    otherTabSets('user', JSON.stringify({ _id: 'peter' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads when another tab logs out', () => {
    const { reload } = setup({ _id: 'keerthi' });
    otherTabSets('user', null);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads a logged-out tab when another tab logs in', () => {
    const { reload } = setup(null);
    otherTabSets('user', JSON.stringify({ _id: 'peter' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the same user is written again', () => {
    const { reload } = setup({ _id: 'keerthi' });
    otherTabSets('user', JSON.stringify({ _id: 'keerthi', firstName: 'Keerthi', age: 21 }));
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing for a logged-out tab when the other tab logs out too', () => {
    const { reload } = setup(null);
    otherTabSets('user', null);
    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores unrelated storage keys', () => {
    const { reload } = setup({ _id: 'keerthi' });
    otherTabSets('theme', 'dark');
    expect(reload).not.toHaveBeenCalled();
  });

  it('treats a corrupted value like a logout', () => {
    const { reload } = setup({ _id: 'keerthi' });
    otherTabSets('user', '{not json');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('stops listening after it unmounts', () => {
    const { reload, unmount } = setup({ _id: 'keerthi' });
    unmount();
    otherTabSets('user', JSON.stringify({ _id: 'peter' }));
    expect(reload).not.toHaveBeenCalled();
  });
});
