import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import authReducer from '../redux/authslice';
import Navbar from '../components/shared/Navbar';
import { api } from '../utils/api';
import { goTo } from '../utils/navigation';

// Only the network and the full-page redirect are replaced.
vi.mock('../utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  api: { get: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../utils/navigation', () => ({ goTo: vi.fn() }));

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;

const renderNavbar = (user) =>
  render(
    <Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user, checkingSession: false } } })}>
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const logOut = async () => {
  await userEvent.click(document.querySelector('.avatar-trigger'));
  await userEvent.click(await screen.findByRole('button', { name: 'Logout' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CLIENT_BASE_URL', 'http://localhost:5173');
});
afterEach(() => vi.unstubAllEnvs());

describe('Navbar logout', () => {
  it('sends a password user to the login page and never leaves the app', async () => {
    renderNavbar({ _id: '1', firstName: 'Pat', lastName: 'Lee', authProvider: 'local' });
    await logOut();

    expect(api.get).toHaveBeenCalledWith('/user/logout');
    expect(goTo).not.toHaveBeenCalled();
    expect(await screen.findByText('/login')).toBeInTheDocument();
  });

  it('also signs a CAS user out of IIIT single sign-on, returning to this site', async () => {
    renderNavbar({ _id: '1', firstName: 'Cas', lastName: 'User', authProvider: 'cas' });
    await logOut();

    expect(api.get).toHaveBeenCalledWith('/user/logout');
    expect(goTo).toHaveBeenCalledWith(
      `https://login.iiit.ac.in/cas/logout?service=${encodeURIComponent('http://localhost:5173')}`
    );
  });

  it('falls back to the login page for a CAS user when no return address is configured', async () => {
    vi.stubEnv('VITE_CLIENT_BASE_URL', '');
    renderNavbar({ _id: '1', firstName: 'Cas', lastName: 'User', authProvider: 'cas' });
    await logOut();

    expect(goTo).not.toHaveBeenCalled();
    expect(await screen.findByText('/login')).toBeInTheDocument();
  });

  it('treats a cached user from before the field existed like a password user', async () => {
    renderNavbar({ _id: '1', firstName: 'Old', lastName: 'Cache' }); // no authProvider yet
    await logOut();
    expect(goTo).not.toHaveBeenCalled();
  });
});

describe('Navbar links', () => {
  it('shows Admin only to admins, and highlights the current page', () => {
    const { unmount } = renderNavbar({ _id: '1', firstName: 'A', lastName: 'B', isAdmin: false });
    expect(screen.queryByRole('link', { name: 'Admin' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Orders' })).toHaveClass('active'); // we're on /orders
    expect(screen.getByRole('link', { name: 'Browse' })).not.toHaveClass('active');
    unmount();

    renderNavbar({ _id: '1', firstName: 'A', lastName: 'B', isAdmin: true });
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });

  it('shows Login and Register to guests', () => {
    renderNavbar(null);
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });
});
