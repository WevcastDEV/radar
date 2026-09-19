import axios from 'axios';
import { getTokens, setTokens, clearTokens } from './auth';
import { useAuthStore } from '@/stores/auth-store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const tokens = getTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = getTokens();
      
      if (tokens?.refreshToken) {
        try {
          const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });
          
          const { accessToken, refreshToken } = response.data;
          setTokens(accessToken, refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearTokens();
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        clearTokens();
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);
