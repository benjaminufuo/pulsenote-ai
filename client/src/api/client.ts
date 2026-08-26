import axios from 'axios';

const env = (import.meta as any).env;
const baseURL = env && env.VITE_API_URL
  ? `${env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulsenote_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('pulsenote_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
