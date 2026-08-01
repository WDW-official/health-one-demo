export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system'];

export function normalizeThemeMode(value: unknown): ThemeMode {
  return THEME_MODES.includes(value as ThemeMode) ? (value as ThemeMode) : 'light';
}

export function getResolvedThemeMode(themeMode: ThemeMode) {
  if (themeMode === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return themeMode === 'dark' ? 'dark' : 'light';
}

export function applyThemeMode(themeMode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', getResolvedThemeMode(themeMode) === 'dark');
}
