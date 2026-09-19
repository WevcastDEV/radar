'use client';

import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      aria-label="Alternar Tema Claro / Escuro"
      className="relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer group active:scale-95 bg-slate-100 border-slate-300 text-amber-500 hover:bg-slate-200 hover:border-amber-500/50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-amber-400 dark:hover:bg-zinc-800 dark:hover:border-amber-500/50 shadow-inner flex-1 w-full"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 stroke-[2.5] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 stroke-[2.5] transition-transform duration-300 group-hover:scale-110 shrink-0" />
      )}
    </button>
  );
}
