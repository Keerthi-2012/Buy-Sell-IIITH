import { createSlice } from '@reduxjs/toolkit';

const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken || null, // ✅ Add this
    isAuthenticated: !!storedToken,
    loading: false,
    error: null,
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

    setToken(state, action) {
      state.token = action.payload; // ✅ Track token
      localStorage.setItem('token', action.payload); // ✅ Sync to localStorage
    },
    logout(state) {
      state.user = null;
      state.token = null; // ✅ Clear token
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  },
});
export const { setLoading, setUser, setToken, logout } = authSlice.actions;
export default authSlice.reducer;

