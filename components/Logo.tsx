import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
  color?: string;
  background?: 'rounded' | 'flat' | 'none';
  bgColor?: string;
}

const NAVY = '#07172B';
const PURPLE = '#A21CFF';
const BLUE = '#00A8FF';

export function Logo({ size = 64, color, background = 'rounded', bgColor = NAVY }: LogoProps) {
  const mono = Boolean(color);
  const markColor = color ?? '#FFFFFF';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="brandRing" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={PURPLE} />
          <Stop offset="1" stopColor={BLUE} />
        </LinearGradient>
      </Defs>

      {background !== 'none' ? (
        <Path
          d={background === 'rounded'
            ? 'M22 3h56c11 0 19 8 19 19v56c0 11-8 19-19 19H22C11 97 3 89 3 78V22C3 11 11 3 22 3Z'
            : 'M0 0h100v100H0Z'}
          fill={bgColor}
        />
      ) : null}

      <Circle cx="50" cy="50" r="38" fill="none" stroke={mono ? markColor : 'url(#brandRing)'} strokeWidth="5" />

      {/* Relaxed handwritten-style TH monogram, built as vectors for cross-platform consistency. */}
      <Path
        d="M22 32 C36 24, 52 22, 65 24 C53 27, 42 29, 32 31 L25 62 C29 54, 34 44, 40 34 C37 50, 35 61, 32 73"
        fill="none"
        stroke={markColor}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M49 31 C46 44, 44 58, 42 70 M43 51 C51 47, 60 44, 68 43 M69 31 C65 44, 62 58, 61 70"
        fill="none"
        stroke={markColor}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M25 75 C39 68, 56 66, 74 68"
        fill="none"
        stroke={mono ? markColor : 'url(#brandRing)'}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}
