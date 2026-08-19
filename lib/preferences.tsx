/** User preferences — persisted to AsyncStorage, available app-wide via context. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export const ACCENT_COLORS = {
  amber:      { label: 'Electric Purple', value: '#8B24FF' },
  terracotta: { label: 'Electric Blue',   value: '#168BFF' },
  sage:       { label: 'Aqua',            value: '#05BFEA' },
  plum:       { label: 'Deep Violet',     value: '#6C22C7' },
  slate:      { label: 'Midnight',        value: '#334A68' },
  crimson:    { label: 'Hot Magenta',     value: '#D51974' },
} as const;

export type AccentKey = keyof typeof ACCENT_COLORS;
export type DarkModePreference = 'system' | 'light' | 'dark';

export interface Preferences {
  darkMode: DarkModePreference;
  showEmoji: boolean;
  accentColor: AccentKey;
}

interface PreferencesCtx extends Preferences {
  setDarkMode: (v: DarkModePreference) => void;
  setShowEmoji: (v: boolean) => void;
  setAccentColor: (v: AccentKey) => void;
  loaded: boolean;
}

const DEFAULTS: Preferences = {
  darkMode: 'system',
  showEmoji: true,
  accentColor: 'amber',
};

const STORAGE_KEY = '@trainerhub/preferences';

const PreferencesContext = createContext<PreferencesCtx>({
  ...DEFAULTS,
  setDarkMode: () => null,
  setShowEmoji: () => null,
  setAccentColor: () => null,
  loaded: false,
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Preferences>;
          if (parsed.accentColor && !(parsed.accentColor in ACCENT_COLORS)) delete parsed.accentColor;
          setPrefs((prev) => ({ ...prev, ...parsed }));
        }
      })
      .catch(() => null)
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: Preferences) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => null);
  }, []);

  const setDarkMode = useCallback((v: DarkModePreference) => {
    setPrefs((prev) => {
      const next = { ...prev, darkMode: v };
      persist(next);
      return next;
    });
  }, [persist]);

  const setShowEmoji = useCallback((v: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, showEmoji: v };
      persist(next);
      return next;
    });
  }, [persist]);

  const setAccentColor = useCallback((v: AccentKey) => {
    setPrefs((prev) => {
      const next = { ...prev, accentColor: v };
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <PreferencesContext.Provider value={{ ...prefs, setDarkMode, setShowEmoji, setAccentColor, loaded }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesCtx {
  return useContext(PreferencesContext);
}
