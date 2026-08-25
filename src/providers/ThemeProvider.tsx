import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { FolderPackKey } from '@/components/ui/FolderIcon';
import { type AccentThemeKey, type ColorScheme, type Palette, buildPalette } from '@/constants/theme';

const STORAGE_KEY = 'study-companion-theme-prefs-v1';

type StoredPrefs = {
  accentKey: AccentThemeKey;
  scheme: ColorScheme;
  folderPack: FolderPackKey;
};

const defaults: StoredPrefs = {
  accentKey: 'blush',
  scheme: 'light',
  folderPack: 'cutesyPink',
};

type ThemeContextValue = StoredPrefs & {
  palette: Palette;
  setAccentKey: (value: AccentThemeKey) => void;
  setScheme: (value: ColorScheme) => void;
  setFolderPack: (value: FolderPackKey) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [prefs, setPrefs] = useState<StoredPrefs>(defaults);

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!mounted || !raw) return;

      try {
        const parsed = JSON.parse(raw) as Partial<StoredPrefs>;

        setPrefs((current) => ({ ...current, ...parsed }));
      } catch {
        // Ignore corrupt storage; fall back to defaults.
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback((next: StoredPrefs) => {
    setPrefs(next);

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setAccentKey = useCallback(
    (accentKey: AccentThemeKey) => persist({ ...prefs, accentKey }),
    [persist, prefs],
  );

  const setScheme = useCallback(
    (scheme: ColorScheme) => persist({ ...prefs, scheme }),
    [persist, prefs],
  );

  const setFolderPack = useCallback(
    (folderPack: FolderPackKey) => persist({ ...prefs, folderPack }),
    [persist, prefs],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...prefs,
      palette: buildPalette(prefs.accentKey, prefs.scheme),
      setAccentKey,
      setScheme,
      setFolderPack,
    }),
    [prefs, setAccentKey, setScheme, setFolderPack],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) throw new Error('useTheme must be used inside ThemeProvider.');

  return context;
}
