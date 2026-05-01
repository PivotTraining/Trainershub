/**
 * Design tokens — colours, spacing, radius, typography.
 *
 * Palette direction: warm & human. Inspired by boutique studio apps,
 * Airbnb, and Apple/Calm. Ivory/cream light mode, warm brown-black dark mode.
 * No cold navy, no blue-lavender tints.
 *
 * New code should pull the active palette via `useTheme()` (lib/useTheme.ts).
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

// ── Light palette — warm ivory ─────────────────────────────────────────────────
// Inspired by Airbnb, Calm, and boutique studio apps.
// Warm ivory background, brown-black ink — human and approachable.

export const lightColors = {
  background:    '#F7F5F2',   // warm ivory — alive without shouting
  surface:       '#FFFFFF',
  surfaceCard:   '#FFFEFB',   // barely-warm white cards
  surfaceRaised: '#EDE9E3',   // warm sand for elevated elements

  ink:         '#1A1512',     // warm brown-black — richer than cold #111
  inkSoft:     '#3D342C',
  muted:       '#8B7D73',     // warm grey-brown — not cold grey
  placeholder: '#B5A89F',
  disabled:    '#D4C8C0',

  border:      '#E5DDD6',     // warm border
  borderInput: '#C8BDB4',

  success:          '#2D6A4F',
  successBg:        '#D8F0E4',
  info:             '#1D5FA5',
  infoBg:           '#EBF2FF',
  danger:           '#C0392B',
  dangerBg:         '#FDECEA',
  warning:          '#B45309',
  warningBg:        '#FEF3C7',

  statusScheduled:  '#2D6A4F',
  statusCompleted:  '#1D5FA5',
  statusCanceled:   '#C0392B',

  white: '#FFFFFF',
  black: '#000000',
} as const;

// ── Dark palette — warm premium ────────────────────────────────────────────────
// Deep warm brown-black. Think Whoop or a premium leather notebook.
// Surfaces step clearly so cards have real depth.

export const darkColors = {
  background:    '#131009',   // warm deep brown-black
  surface:       '#1E1A12',
  surfaceCard:   '#272218',
  surfaceRaised: '#332E22',

  ink:         '#F5F0E8',     // warm off-white — easy on eyes
  inkSoft:     '#D4C9B8',
  muted:       '#8A7D6C',     // warm muted
  placeholder: '#5A5040',
  disabled:    '#3A3228',

  border:      '#302A1E',
  borderInput: '#40382A',

  success:          '#34D399',
  successBg:        '#05200F',
  info:             '#60A5FA',
  infoBg:           '#051525',
  danger:           '#F87171',
  dangerBg:         '#250808',
  warning:          '#FBBF24',
  warningBg:        '#221500',

  statusScheduled:  '#34D399',
  statusCompleted:  '#60A5FA',
  statusCanceled:   '#F87171',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorPalette = { [K in keyof typeof lightColors]: string };

// ── Legacy flat alias (backward-compat) ───────────────────────────────────────

export const colors: ColorPalette = lightColors;

// ── Brand gradient (logo chevron) ─────────────────────────────────────────────
// Kept for the Logo component — not used as a UI motif in the warm redesign.

export const BRAND_GRADIENT = {
  start: '#0EA5E9',
  end:   '#6366F1',
} as const;

// ── Avatar colour pool — warmer, earthier swatches ────────────────────────────

export const AVATAR_SWATCHES: { bg: string; fg: string }[] = [
  { bg: '#FEF3C7', fg: '#92400E' }, // amber
  { bg: '#FEE2E2', fg: '#991B1B' }, // red
  { bg: '#D1FAE5', fg: '#065F46' }, // emerald
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
  { bg: '#F3E8FF', fg: '#6B21A8' }, // violet
  { bg: '#FED7AA', fg: '#9A3412' }, // orange
  { bg: '#CFFAFE', fg: '#155E75' }, // cyan
  { bg: '#EEF2FF', fg: '#4338CA' }, // indigo
  { bg: '#E0E7FF', fg: '#3730A3' }, // blue
  { bg: '#ECFDF5', fg: '#065F46' }, // green
];

/** Deterministic swatch from any string seed (client name, user id…). */
export function avatarSwatch(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_SWATCHES[h % AVATAR_SWATCHES.length];
}
