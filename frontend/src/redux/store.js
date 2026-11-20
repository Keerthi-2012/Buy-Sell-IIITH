import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authslice';

// The Redux store; it only holds who is logged in.
const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export default store;
