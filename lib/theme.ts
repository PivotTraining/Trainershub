/**
 * Design tokens — colours, spacing, radius, typography.
 *
 * New code should pull the active palette via `useTheme()` (lib/useTheme.tsx),
 * which resolves dark/light and accent colour from user preferences.
 * The `colors` export is kept for backward-compat with existing screens.
 */

// ── Spacing ────────────────────────────────────────────────────────────────────

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ── Border radius ──────────────────────────────────────────────────────────────

export const radius = {
  sm:     6,
  md:     8,
  lg:     12,
  pill:   30,
  circle: 9999,
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────

export const typography = {
  xs:      12,
  sm:      13,
  md:      15,
  base:    16,
  lg:      17,
  xl:      20,
  xxl:     22,
  display: 26,
} as const;

// ── Light palette ──────────────────────────────────────────────────────────────

export const lightColors = {
  background:    '#FAFAFA',
  surface:       '#FFFFFF',
  surfaceCard:   '#FFFFFF',
  surfaceRaised: '#F5F5F5',

  ink:         '#111111',
  inkSoft:     '#333333',
  muted:       '#888888',
  placeholder: '#AAAAAA',
  disabled:    '#CCCCCC',

  border:      '#EEEEEE',
  borderInput: '#D0D0D0',

  success:          '#00875A',
  successBg:        '#E3FCEF',
  info:             '#0052CC',
  infoBg:           '#E6F0FF',
  danger:           '#CC3333',
  dangerBg:         '#FFEBE6',
  warning:          '#FF8B00',
  warningBg:        '#FFFAE6',

  statusScheduled:  '#00875A',
  statusCompleted:  '#0052CC',
  statusCanceled:   '#CC3333',

  white: '#FFFFFF',
  black: '#000000',
} as const;

// ── Dark palette ───────────────────────────────────────────────────────────────

export const darkColors = {
  background:    '#111111',
  surface:       '#1C1C1E',
  surfaceCard:   '#2C2C2E',
  surfaceRaised: '#3A3A3C',

  ink:         '#F2F2F7',
  inkSoft:     '#EBEBF5',
  muted:       '#8E8E93',
  placeholder: '#636366',
  disabled:    '#48484A',

  border:      '#3A3A3C',
  borderInput: '#48484A',

  success:          '#30D158',
  successBg:        '#0D2B1C',
  info:             '#0A84FF',
  infoBg:           '#0C1A36',
  danger:           '#FF453A',
  dangerBg:         '#2D0C0A',
  warning:          '#FF9F0A',
  warningBg:        '#2D1F00',

  statusScheduled:  '#30D158',
  statusCompleted:  '#0A84FF',
  statusCanceled:   '#FF453A',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorPalette = { [K in keyof typeof lightColors]: string };

// ── Legacy flat alias (backward-compat) ───────────────────────────────────────
// Existing screens that import `colors` keep working; new screens use useTheme.

export const colors: ColorPalette = lightColors;

// ── Avatar colour pool ─────────────────────────────────────────────────────────

export const AVATAR_SWATCHES: { bg: string; fg: string }[] = [
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // blue
  { bg: '#D1FAE5', fg: '#065F46' }, // green
  { bg: '#FEE2E2', fg: '#991B1B' }, // red
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#F3E8FF', fg: '#6B21A8' }, // purple
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#CFFAFE', fg: '#155E75' }, // cyan
  { bg: '#FED7AA', fg: '#9A3412' }, // orange
  { bg: '#E0E7FF', fg: '#3730A3' }, // indigo
  { bg: '#ECFDF5', fg: '#065F46' }, // emerald
];

/** Deterministic swatch from any string seed (client name, user id…). */
export function avatarSwatch(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_SWATCHES[h % AVATAR_SWATCHES.length];
}
