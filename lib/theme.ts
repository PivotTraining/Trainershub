/**
 * Central design tokens.  Import from here instead of hardcoding hex strings
 * in components.  Keeps a single source of truth for colours and spacing and
 * makes a future dark-mode pass trivial.
 */

export const colors = {
  // ── Brand ───────────────────────────────────────────────────────────────
  ink: '#111111',
  inkSoft: '#333333',

  // ── Semantic ─────────────────────────────────────────────────────────────
  success: '#00875A',
  successBg: '#E3FCEF',
  info: '#0052CC',
  infoBg: '#E6F0FF',
  warning: '#FF8B00',
  warningBg: '#FFFAE6',
  danger: '#CC3333',
  dangerBg: '#FFEBE6',

  // ── Session-status colours ────────────────────────────────────────────
  statusScheduled: '#00875A',
  statusCompleted: '#0052CC',
  statusCanceled: '#CC3333',

  // ── Neutrals ─────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceCard: '#FFFFFF',
  border: '#EEEEEE',
  borderInput: '#D0D0D0',
  muted: '#888888',
  placeholder: '#AAAAAA',
  disabled: '#CCCCCC',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 30,
  circle: 9999,
} as const;

export const typography = {
  xs: 12,
  sm: 13,
  md: 15,
  base: 16,
  lg: 17,
  xl: 20,
  xxl: 22,
  display: 26,
} as const;
