import axios from 'axios';
import store from '../redux/store';
import { logout } from '../redux/authslice';

// Auth is an httpOnly cookie set by the server, so there is no token handling here.
// In dev the Vite proxy forwards /api to the backend; in production the backend
// serves this app, so a relative URL works there too.
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

/** Best human-readable message from a failed request. */
export const errorMessage = (error, fallback = 'Something went wrong') =>
  error.response?.data?.message ||
  (error.request ? 'Network error. Please check your connection.' : fallback);

export const rupees = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

export const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || 'Unknown';
