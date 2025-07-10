import axios from "axios";
import { logout, setLoading } from "./authslice.js";

const API = import.meta.env.VITE_API_BASE_URL;

export const logoutUser = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    await axios.get(`${API}/user/logout`, { withCredentials: true });
    dispatch(logout());
  } catch (error) {
    console.error("Logout error:", error.response?.data?.message || error.message);
  } finally {
    dispatch(setLoading(false));
  }
};
  