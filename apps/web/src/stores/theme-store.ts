import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

function applyTheme(resolved: 'dark' | 'light') {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(resolved);
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',

  setTheme: (theme: Theme) => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('radar_theme', theme);
    }
    set({ theme, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const { resolvedTheme } = get();
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  initTheme: () => {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('radar_theme') as Theme | null;
    const theme = saved || 'dark';
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
  },
}));
