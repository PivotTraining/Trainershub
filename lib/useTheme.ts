/**
 * useTheme — resolves the active colour palette and accent colour.
 *
 * Returns the full palette (light or dark depending on user preference +
 * system setting) merged with the user's chosen accent colour so every
 * screen can do:
 *
 *   const { colors, accent } = useTheme();
 */
import { ACCENT_COLORS } from './preferences';
import { usePreferences } from './preferences';
import { lightColors, spacing, radius, typography } from './theme';
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
  const { accentColor } = usePreferences();

  // Force light mode while we work through App Review. The dark palette has
  // contrast / glass-blend issues on iPad iOS 26.4 that compound the
  // post-login interaction problems Apple has been reporting. Will re-enable
  // dark mode once approval lands.
  const palette: ColorPalette = lightColors;
  const isDark = false;
  // Fall back to amber (the brand default) if the stored key no longer exists
  // — this handles migrations when accent colour options are updated.
  const accent = ACCENT_COLORS[accentColor]?.value ?? ACCENT_COLORS.amber.value;

  return { colors: palette, accent, isDark, spacing, radius, typography };
}
