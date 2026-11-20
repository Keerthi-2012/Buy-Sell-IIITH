import toast from 'react-hot-toast';
import { errorMessage } from './api';

// Toasts a failed request; an incomplete-profile error also sends the user to /profile.
export const reportError = (error, navigate, fallback) => {
  toast.error(errorMessage(error, fallback));
  if (error.response?.data?.code === 'PROFILE_INCOMPLETE') navigate('/profile');
};
