/**
 * User preferences — persisted to AsyncStorage, available app-wide via context.
 *
 * Preferences:
 *   darkMode   — 'system' | 'light' | 'dark'
 *   showEmoji  — boolean (decorative emoji in greetings / tab labels)
 *   accentColor — one of the ACCENT_COLORS keys
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ── Accent colours ─────────────────────────────────────────────────────────────

export const ACCENT_COLORS = {
  indigo:  { label: 'Indigo',  value: '#6366F1' }, // matches logo gradient end
  sky:     { label: 'Sky',     value: '#0EA5E9' }, // matches logo gradient start
  coral:   { label: 'Coral',   value: '#F97316' }, // energy / warmth
  emerald: { label: 'Emerald', value: '#10B981' }, // nature / health
  violet:  { label: 'Violet',  value: '#8B5CF6' }, // premium
  rose:    { label: 'Rose',    value: '#F43F5E' }, // intensity / passion
} as const;

export type AccentKey = keyof typeof ACCENT_COLORS;
export type DarkModePreference = 'system' | 'light' | 'dark';

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULTS: Preferences = {
  darkMode: 'system',
  showEmoji: true,
  accentColor: 'indigo',
};

const STORAGE_KEY = '@trainerhub/preferences';

// ── Context ────────────────────────────────────────────────────────────────────

const PreferencesContext = createContext<PreferencesCtx>({
  ...DEFAULTS,
  setDarkMode: () => null,
  setShowEmoji: () => null,
  setAccentColor: () => null,
  loaded: false,
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Preferences>;
          // Migrate stale accent key — drop it so the default kicks in.
          if (parsed.accentColor && !(parsed.accentColor in ACCENT_COLORS)) {
            delete parsed.accentColor;
          }
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
    <PreferencesContext.Provider
      value={{ ...prefs, setDarkMode, setShowEmoji, setAccentColor, loaded }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePreferences(): PreferencesCtx {
  return useContext(PreferencesContext);
}
