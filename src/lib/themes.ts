export type Theme = 'theme-military' | 'theme-night' | 'theme-light';

export interface ThemeColors {
  name: string;
  id: Theme;
  primary: string;
}

export const themes: ThemeColors[] = [
  { id: 'theme-military', name: 'Militar', primary: 'hsl(150, 15%, 20%)' },
  { id: 'theme-night', name: 'Noturno', primary: 'hsl(220, 20%, 15%)' },
  { id: 'theme-light', name: 'Claro', primary: 'hsl(40, 20%, 88%)' },
];

const STORAGE_KEY = 'taf-theme';

export function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'theme-military';
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  
  // Remove existing themes
  const root = document.documentElement;
  themes.forEach(t => root.classList.remove(t.id));
  
  // Add new theme
  root.classList.add(theme);
}
