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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false, // Will be updated on init or login
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    clearTokens();
    set({ user: null, isAuthenticated: false });
  },
  checkAuth: () => {
    set({ isAuthenticated: isAuthenticated() });
  }
}));
