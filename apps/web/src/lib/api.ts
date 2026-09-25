import axios from 'axios';
import { getTokens, setTokens, clearTokens } from './auth';
import { useAuthStore } from '@/stores/auth-store';
import { getOrCreateDeviceId } from './device-id';

export function getBaseApiUrl(): string {
  if (typeof window !== 'undefined') {
    // No navegador (Vercel ou local):
    // Se acessado via HTTPS, sempre usa /api relativo para evitar bloqueio de Mixed Content
    if (window.location.protocol === 'https:') {
      return '/api';
    }
    // Se tiver NEXT_PUBLIC_API_URL definido explicitamente para um domínio HTTPS ou proxy
    if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost:3001')) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    // Padroniza rota unificada /api tratada pelo Next.js
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
}

export const api = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    // Garante baseURL segura em runtime no navegador
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'https:' || !process.env.NEXT_PUBLIC_API_URL) {
        config.baseURL = '/api';
      }
    }

    const tokens = getTokens();
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    try {
      const did = getOrCreateDeviceId();
      if (did) config.headers['x-device-id'] = did;
    } catch {}
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
          const currentBase = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '/api' : (api.defaults.baseURL || '/api');
          const response = await axios.post(`${currentBase}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });
          
          const { accessToken, refreshToken } = response.data;
          setTokens(accessToken, refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          clearTokens();
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        clearTokens();
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);
