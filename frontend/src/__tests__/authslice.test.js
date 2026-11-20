import { describe, it, expect } from 'vitest';
import reducer, { setUser, logout, sessionChecked } from '../redux/authslice';

const initial = reducer(undefined, { type: '@@init' });

describe('auth slice', () => {
  it('starts logged out and still checking the session', () => {
    expect(initial.user).toBeNull();
    expect(initial.checkingSession).toBe(true);
  });

  it('setUser stores the user and caches it for the next page load', () => {
    const state = reducer(initial, setUser({ _id: '1', firstName: 'Asha' }));
    expect(state.user.firstName).toBe('Asha');
    expect(JSON.parse(localStorage.getItem('user')).firstName).toBe('Asha');
  });

  it('setUser merges, so a partial update keeps earlier fields', () => {
    let state = reducer(initial, setUser({ _id: '1', firstName: 'Asha', isAdmin: false }));
    state = reducer(state, setUser({ profileComplete: true }));
    expect(state.user).toMatchObject({ firstName: 'Asha', profileComplete: true });
  });

  it('logout wipes the user and the cache', () => {
    const loggedIn = reducer(initial, setUser({ _id: '1' }));
    const state = reducer(loggedIn, logout());
    expect(state.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('sessionChecked ends the loading state', () => {
    expect(reducer(initial, sessionChecked()).checkingSession).toBe(false);
  });
});
