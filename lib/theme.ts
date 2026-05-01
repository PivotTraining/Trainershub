/**
 * Design tokens — colours, spacing, radius, typography.
 *
 * The brand uses a sky-blue → indigo gradient (matching the Logo chevron).
 * All palettes are built around that anchor so the system feels coherent.
 *
 * New code should pull the active palette via `useTheme()` (lib/useTheme.ts),
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
  md:     12,
  lg:     18,
  pill:   32,
  circle: 9999,
} as const;

// ── Typography ─────────────────────────────────────────────────────────────────

export const typography = {
  xs:      12,
  sm:      13,
  md:      15,
  base:    16,
  lg:      18,
  xl:      22,
  xxl:     26,
  display: 32,
} as const;

// ── Light palette ──────────────────────────────────────────────────────────────
// Slightly blue-tinted whites give the UI life vs flat grey. Deep indigo-black
// ink reads richer than pure #111.

export const lightColors = {
  background:    '#F5F6FF',   // very light lavender-white — alive, not grey
  surface:       '#FFFFFF',
  surfaceCard:   '#FFFFFF',
  surfaceRaised: '#ECEEFF',   // indigo-tinted elevated surface

  ink:         '#0D0D24',     // deep indigo-black — warmer than pure black
  inkSoft:     '#2A2A4A',
  muted:       '#7070A0',     // cool-tinted muted — not plain grey
  placeholder: '#ABABC8',
  disabled:    '#C8C8DC',

  border:      '#E4E4F0',     // slightly warm border
  borderInput: '#CACAD8',

  success:          '#059669',
  successBg:        '#D1FAE5',
  info:             '#0284C7',
  infoBg:           '#E0F2FE',
  danger:           '#DC2626',
  dangerBg:         '#FEE2E2',
  warning:          '#D97706',
  warningBg:        '#FEF3C7',

  statusScheduled:  '#059669',
  statusCompleted:  '#0284C7',
  statusCanceled:   '#DC2626',

  white: '#FFFFFF',
  black: '#000000',
} as const;

// ── Dark palette ───────────────────────────────────────────────────────────────
// Deep navy-black rather than system grey — feels premium and high-contrast.
// Surfaces step up clearly from background so cards have real depth.

export const darkColors = {
  background:    '#090915',   // deep navy-black
  surface:       '#11112A',
  surfaceCard:   '#1A1A35',
  surfaceRaised: '#242445',

  ink:         '#EDEDFF',     // slightly blue-white — easy on eyes
  inkSoft:     '#C0C0E8',
  muted:       '#8080AA',
  placeholder: '#50507A',
  disabled:    '#30304A',

  border:      '#25253D',
  borderInput: '#353558',

  success:          '#34D399',
  successBg:        '#05200F',
  info:             '#38BDF8',
  infoBg:           '#041825',
  danger:           '#F87171',
  dangerBg:         '#250808',
  warning:          '#FBBF24',
  warningBg:        '#221500',

  statusScheduled:  '#34D399',
  statusCompleted:  '#38BDF8',
  statusCanceled:   '#F87171',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorPalette = { [K in keyof typeof lightColors]: string };

// ── Legacy flat alias (backward-compat) ───────────────────────────────────────

export const colors: ColorPalette = lightColors;

// ── Brand gradient stops (matches Logo chevron) ────────────────────────────────

export const BRAND_GRADIENT = {
  start: '#0EA5E9',   // sky-400
  end:   '#6366F1',   // indigo-500
} as const;

// ── Avatar colour pool ─────────────────────────────────────────────────────────

export const AVATAR_SWATCHES: { bg: string; fg: string }[] = [
  { bg: '#EEF2FF', fg: '#4338CA' }, // indigo
  { bg: '#E0F2FE', fg: '#0369A1' }, // sky
  { bg: '#D1FAE5', fg: '#065F46' }, // emerald
  { bg: '#FEE2E2', fg: '#991B1B' }, // red
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#F3E8FF', fg: '#6B21A8' }, // violet
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#CFFAFE', fg: '#155E75' }, // cyan
  { bg: '#FED7AA', fg: '#9A3412' }, // orange
  { bg: '#F0FDF4', fg: '#166534' }, // green
];

/** Deterministic swatch from any string seed (client name, user id…). */
export function avatarSwatch(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_SWATCHES[h % AVATAR_SWATCHES.length];
}
