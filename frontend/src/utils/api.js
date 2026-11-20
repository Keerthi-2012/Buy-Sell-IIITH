import axios from 'axios';
import store from '../redux/store';
import { logout } from '../redux/authslice';

// Auth is an httpOnly cookie, so no token handling; dev proxies /api and prod serves this app.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 15000,
});

// If the session expired server-side, drop the stale local user.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url ?? '';
    const isAuthCall = url.startsWith('/user/login') || url.startsWith('/user/register');
    if (error.response?.status === 401 && !isAuthCall && store.getState().auth.user) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

// Picks a readable message out of a failed request.
export const errorMessage = (error, fallback = 'Something went wrong') =>
  error.response?.data?.message ||
  (error.request ? 'Network error. Please check your connection.' : fallback);

// 1500 -> "₹1,500".
export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

// "First Last" for a user object, skipping blank parts.
export const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown';
