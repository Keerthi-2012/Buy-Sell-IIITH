import { api } from '../utils/api.js';
import { logout } from './authslice.js';

// Logs out on the server (clears the cookie), then clears local state.
export const logoutUser = () => async (dispatch) => {
  try {
    await api.get('/user/logout');
  } catch (error) {
    console.error('Logout error:', error.response?.data?.message || error.message);
  } finally {
    // Clear local state even if the request failed; the cookie expires on its own.
    dispatch(logout());
  }
};
