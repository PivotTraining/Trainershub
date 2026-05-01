/**
 * useTheme — resolves the active colour palette and accent colour.
 *
 * Returns the full palette (light or dark depending on user preference +
 * system setting) merged with the user's chosen accent colour so every
 * screen can do:
 *
 *   const { colors, accent } = useTheme();
 */
import { useColorScheme } from 'react-native';
import { ACCENT_COLORS } from './preferences';
import { usePreferences } from './preferences';
import { darkColors, lightColors, spacing, radius, typography } from './theme';
import type { ColorPalette } from './theme';

export interface Theme {
  colors: ColorPalette;
  /** The user's chosen accent colour (hex string). */
  accent: string;
  isDark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export function useTheme(): Theme {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const { darkMode, accentColor } = usePreferences();

  const isDark =
    darkMode === 'dark' ||
    (darkMode === 'system' && system === 'dark');

  const palette: ColorPalette = isDark ? darkColors : lightColors;
  // Fall back to indigo (the brand default) if the stored key no longer exists
  // — this handles migrations when accent colour options are updated.
  const accent = ACCENT_COLORS[accentColor]?.value ?? ACCENT_COLORS.indigo.value;

  return { colors: palette, accent, isDark, spacing, radius, typography };
}
