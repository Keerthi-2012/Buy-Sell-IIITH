import { createSlice } from '@reduxjs/toolkit';

// Only non-secret profile data is cached locally. The session itself lives in an
// httpOnly cookie that JavaScript cannot read.
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

const storedUser = readStoredUser();

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser,
    isAuthenticated: !!storedUser,
    // true until the first /user/profile check finishes, so guarded routes don't flash a redirect
    checkingSession: true,
    loading: false,
  },
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(state.user));
    },
    sessionChecked(state) {
      state.checkingSession = false;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('user');
      localStorage.removeItem('token'); // legacy key from the old token-in-localStorage scheme
    },
  },
});

export const { setLoading, setUser, sessionChecked, logout } = authSlice.actions;
export default authSlice.reducer;
