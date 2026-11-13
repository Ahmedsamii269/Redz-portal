import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
  isZenMode: boolean;
  toggleZenMode: () => void;
  setZenMode: (zen: boolean) => void;
  isCompactMode: boolean;
  toggleCompactMode: () => void;
  uiScale: number;
  setUiScale: (scale: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('redz_ui_theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  const [isZenMode, setZenModeState] = useState<boolean>(() => {
    return localStorage.getItem('redz_zen_mode') === 'true';
  });

  const [isCompactMode, setCompactModeState] = useState<boolean>(() => {
    return localStorage.getItem('redz_compact_mode') === 'true';
  });

  const [uiScale, setUiScaleState] = useState<number>(() => {
    const saved = localStorage.getItem('redz_ui_scale');
    return saved ? parseFloat(saved) : 1;
  });

  useEffect(() => {
    localStorage.setItem('redz_ui_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale * 16}px`;
    localStorage.setItem('redz_ui_scale', String(uiScale));
  }, [uiScale]);

  useEffect(() => {
    localStorage.setItem('redz_zen_mode', String(isZenMode));
  }, [isZenMode]);

  useEffect(() => {
    localStorage.setItem('redz_compact_mode', String(isCompactMode));
  }, [isCompactMode]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
  };

  const toggleZenMode = () => {
    setZenModeState((prev) => !prev);
  };

  const setZenMode = (zen: boolean) => {
    setZenModeState(zen);
  };

  const toggleCompactMode = () => {
    setCompactModeState((prev) => !prev);
  };

  const setUiScale = (s: number) => {
    setUiScaleState(s);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setTheme,
        isZenMode,
        toggleZenMode,
        setZenMode,
        isCompactMode,
        toggleCompactMode,
        uiScale,
        setUiScale,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
