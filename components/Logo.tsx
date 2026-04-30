/**
 * Logo — TrainerHub mark, scalable.  Uses react-native-svg for crisp rendering
 * at any size.  The mark is an upward chevron (representing growth) inside a
 * rounded square — versatile enough to read across all trainer sectors, not
 * just fitness.
 */
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  color?: string;        // override gradient with a solid colour (used for monochrome contexts)
  background?: 'rounded' | 'none';
}

export function Logo({ size = 64, color, background = 'rounded' }: LogoProps) {
  const stroke = color ?? 'url(#th-grad)';

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="th-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#0EA5E9" />
          <Stop offset="1" stopColor="#6366F1" />
        </LinearGradient>
      </Defs>
      {background === 'rounded' && (
        <Rect x="0" y="0" width="64" height="64" rx="14" fill={color ?? 'url(#th-grad)'} />
      )}
      {/* Upward chevron — symbolises ascent / progress */}
      <Path
        d="M16 42 L32 22 L48 42"
        stroke={background === 'rounded' ? '#fff' : stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner accent dot — subtle, suggests focus */}
      <Path
        d="M32 35 L32 35"
        stroke={background === 'rounded' ? '#fff' : stroke}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.55"
      />
    </Svg>
  );
}
