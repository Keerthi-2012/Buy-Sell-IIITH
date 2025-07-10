// src/utils/api.js
export const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const apiFetch = (endpoint, options = {}) => {
  return fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
  });
};
