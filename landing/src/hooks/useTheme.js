import { useState, useEffect } from 'react';

const THEME_KEY = 'sharkfit-theme';

const getInitialTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  if (!saved) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
    return 'dark';
  }
  document.documentElement.setAttribute('data-theme', saved);
  return saved;
};

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (t) => setThemeState(t);

  return { theme, toggleTheme, setTheme };
}

export default useTheme;
