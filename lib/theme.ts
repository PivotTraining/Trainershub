/**
 * TrainerHub design tokens.
 * Core brand identity: deep navy + electric purple → blue gradient.
 * User-selected accent colors can personalize controls, but the brand mark and
 * primary navigation identity stay consistent.
 */

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const radius = {
  sm:     6,
  md:     12,
  lg:     18,
  pill:   32,
  circle: 9999,
} as const;

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

export const BRAND = {
  navy: '#07172B',
  navyRaised: '#0B203A',
  purple: '#A21CFF',
  violet: '#7B24F4',
  blue: '#168BFF',
  cyan: '#05BFEA',
  white: '#FFFFFF',
} as const;

export const lightColors = {
  // The global AppCanvas owns the page background. Screen shells stay
  // transparent so the quiet white → cool-blue → lavender undertone can show.
  background:    'transparent',
  surface:       '#FFFFFF',
  surfaceCard:   '#FFFFFF',
  surfaceRaised: '#F3F6FA',

  ink:         '#07172B',
  inkSoft:     '#24384F',
  muted:       '#718096',
  placeholder: '#A4B0BF',
  disabled:    '#D6DEE8',

  border:      '#E3E9F1',
  borderInput: '#CBD5E1',

  success:          '#16865F',
  successBg:        '#E3F7EF',
  info:             '#168BFF',
  infoBg:           '#EAF4FF',
  danger:           '#C0392B',
  dangerBg:         '#FDECEA',
  warning:          '#B45309',
  warningBg:        '#FEF3C7',

  statusScheduled:  '#16865F',
  statusCompleted:  '#168BFF',
  statusCanceled:   '#C0392B',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const darkColors = {
  background:    '#050E1A',
  surface:       '#07172B',
  surfaceCard:   '#0B203A',
  surfaceRaised: '#122A47',

  ink:         '#F8FBFF',
  inkSoft:     '#CAD5E2',
  muted:       '#8292A8',
  placeholder: '#5F7188',
  disabled:    '#2D4057',

  border:      '#18304D',
  borderInput: '#244260',

  success:          '#34D399',
  successBg:        '#052419',
  info:             '#5CB0FF',
  infoBg:           '#071D34',
  danger:           '#F87171',
  dangerBg:         '#250808',
  warning:          '#FBBF24',
  warningBg:        '#221500',

  statusScheduled:  '#34D399',
  statusCompleted:  '#5CB0FF',
  statusCanceled:   '#F87171',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorPalette = { [K in keyof typeof lightColors]: string };
export const colors: ColorPalette = lightColors;

export const BRAND_GRADIENT = {
  start: BRAND.purple,
  end: BRAND.blue,
} as const;

export const AVATAR_SWATCHES: { bg: string; fg: string }[] = [
  { bg: '#F0E8FF', fg: '#6C22C7' },
  { bg: '#E7F2FF', fg: '#126ED1' },
  { bg: '#DDF9FF', fg: '#087A96' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#E8EEFF', fg: '#3730A3' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#F3E8FF', fg: '#6B21A8' },
];

export function avatarSwatch(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_SWATCHES[h % AVATAR_SWATCHES.length];
}
