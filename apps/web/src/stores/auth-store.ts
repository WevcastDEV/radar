import { create } from 'zustand';
import { UserProfile } from '@radar/types';
import { isAuthenticated, clearTokens } from '@/lib/auth';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
  checkAuth: () => void;
}

const getInitialUser = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('radar_user_profile');
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  isAuthenticated: false, // Will be updated on init or login
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      try {
        if (user) {
          localStorage.setItem('radar_user_profile', JSON.stringify(user));
        } else {
          localStorage.removeItem('radar_user_profile');
        }
      } catch {}
    }
    set({ user, isAuthenticated: !!user });
  },
  logout: () => {
    clearTokens();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('radar_user_profile');
      } catch {}
    }
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: () => {
    set({ isAuthenticated: isAuthenticated() });
  }
}));
