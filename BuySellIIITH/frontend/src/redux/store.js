import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authslice'; // now this works
import authReducer from './authslice'; // import the reducer directly

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export default store;
