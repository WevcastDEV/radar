import { create } from 'zustand';
import { UserProfile } from '@radar/types';
import { isAuthenticated, clearTokens } from '@/lib/auth';
import { mergeWithPersistentProfile, savePersistentProfile } from '@/lib/user-profiles';

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
    if (saved) {
      const parsed = JSON.parse(saved);
      return mergeWithPersistentProfile(parsed);
    }
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
          const merged = mergeWithPersistentProfile(user);
          savePersistentProfile(merged);
          localStorage.setItem('radar_user_profile', JSON.stringify(merged));
          set({ user: merged, isAuthenticated: true });
          return;
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
