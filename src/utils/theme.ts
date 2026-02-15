import { applyMode, Mode } from '@cloudscape-design/global-styles';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-mode';

export function getThemePreference(): ThemePreference {
  return (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'system';
}

export function setThemePreference(pref: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

export function applyTheme(pref: ThemePreference): void {
  if (pref === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyMode(isDark ? Mode.Dark : Mode.Light);
  } else {
    applyMode(pref === 'dark' ? Mode.Dark : Mode.Light);
  }
}

/** Listen for OS theme changes when preference is 'system'. Returns cleanup function. */
export function listenForSystemThemeChanges(getPref: () => ThemePreference): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getPref() === 'system') {
      applyMode(mq.matches ? Mode.Dark : Mode.Light);
    }
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
