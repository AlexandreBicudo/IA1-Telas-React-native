import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { PALETTES, type Palette, type ThemeMode } from '@/constants/gourmet-theme';

const STORAGE_KEY = 'seuchefe-theme-mode';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: Palette;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: PALETTES.dark,
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  // Restaura a preferência salva.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'light' || value === 'dark') setModeState(value);
    });
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, colors: PALETTES[mode], toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Tema completo (modo + cores + ações). */
export const useTheme = () => useContext(ThemeContext);

/** Apenas a paleta ativa (atalho mais usado nas telas). */
export const useColors = (): Palette => useContext(ThemeContext).colors;
