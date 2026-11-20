import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../redux/authslice';
import ProtectedRoute from '../components/shared/ProtectedRoute';
import ProfilePrompt from '../components/shared/ProfilePrompt';

// Renders `ui` at `path` with a store holding the given auth state.
const renderAt = (path, auth, ui) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { checkingSession: false, ...auth } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </Provider>
  );
};

const routes = (
  <Routes>
    <Route path="/" element={<p>home page</p>} />
    <Route path="/login" element={<p>login page</p>} />
    <Route element={<ProtectedRoute />}>
      <Route path="/orders" element={<p>orders page</p>} />
    </Route>
    <Route element={<ProtectedRoute adminOnly />}>
      <Route path="/admin" element={<p>admin page</p>} />
    </Route>
  </Routes>
);

describe('ProtectedRoute', () => {
  it('sends guests to the login page', () => {
    renderAt('/orders', { user: null }, routes);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('lets a logged-in user through', () => {
    renderAt('/orders', { user: { _id: '1' } }, routes);
    expect(screen.getByText('orders page')).toBeInTheDocument();
  });

  it('waits for the session check instead of redirecting a returning user', () => {
    renderAt('/orders', { user: { _id: '1' }, checkingSession: true }, routes);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('keeps regular users out of admin pages', () => {
    renderAt('/admin', { user: { _id: '1', isAdmin: false } }, routes);
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('lets admins in', () => {
    renderAt('/admin', { user: { _id: '1', isAdmin: true } }, routes);
    expect(screen.getByText('admin page')).toBeInTheDocument();
  });
});

describe('ProfilePrompt', () => {
  const prompt = <ProfilePrompt />;

  it('nudges users whose profile is incomplete', () => {
    renderAt('/', { user: { _id: '1', profileComplete: false } }, prompt);
    expect(screen.getByRole('alert')).toHaveTextContent(/age and contact number/i);
  });

  it('stays hidden for complete profiles, guests and unknown state', () => {
    renderAt('/', { user: { _id: '1', profileComplete: true } }, prompt);
    expect(screen.queryByRole('alert')).toBeNull();
    renderAt('/', { user: null }, prompt);
    expect(screen.queryByRole('alert')).toBeNull();
    renderAt('/', { user: { _id: '1' } }, prompt); // cached user from before the flag existed
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stays hidden on the profile page itself', () => {
    renderAt('/profile', { user: { _id: '1', profileComplete: false } }, prompt);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
