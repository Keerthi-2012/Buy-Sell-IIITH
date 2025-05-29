import axios from "axios";
import { logout, setLoading } from "./authslice.js";

export const logoutUser = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    await axios.get("http://localhost:8000/api/v1/user/logout", {}, { withCredentials: true });
    dispatch(logout());
  } catch (error) {
    console.error("Logout error:", error.response?.data?.message || error.message);
  } finally {
    dispatch(setLoading(false));
  }
};
