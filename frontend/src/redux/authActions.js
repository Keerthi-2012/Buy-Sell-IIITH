import { api } from '../utils/api.js';
import { logout, setLoading } from './authslice.js';

export const logoutUser = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    await api.get('/user/logout');
  } catch (error) {
    console.error('Logout error:', error.response?.data?.message || error.message);
  } finally {
    // Clear local state even if the request failed; the cookie expires on its own.
    dispatch(logout());
    dispatch(setLoading(false));
  }
};
