import { createSlice } from '@reduxjs/toolkit';

// Load user/token from localStorage if available
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    isAuthenticated: !!storedToken,
    loading: false,
    error: null,
  },
  reducers: {
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = true;
      localStorage.setItem('user', JSON.stringify(action.payload)); // update storage here too
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },
});

export const {
  setLoading,
  setUser,
  logout
} = authSlice.actions;

export default authSlice.reducer;
