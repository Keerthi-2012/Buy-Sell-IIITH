import { createSlice } from '@reduxjs/toolkit';

// Only the non-secret profile is cached here; the real session is an httpOnly cookie.
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

// Holds who is logged in.
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: readStoredUser(),
    // true until the first /user/profile check finishes, so guarded routes don't flash a redirect
    checkingSession: true,
  },
  reducers: {
    // Save the user in state and in localStorage so a refresh keeps the UI logged in.
    setUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    // Called once the first server check finishes.
    sessionChecked(state) {
      state.checkingSession = false;
    },
    // Wipe everything we know about the user.
    logout(state) {
      state.user = null;
      localStorage.removeItem('user');
    },
  },
});

export const { setUser, sessionChecked, logout } = authSlice.actions;
export default authSlice.reducer;
