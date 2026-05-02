/**
 * Logo — TrainerHub T-mark.
 *
 * Bold heavy-weight "T" where the crossbar rises to a sharp upward-arrow
 * peak at centre — communicating ascent, progress, coaching momentum.
 *
 * Rendering modes:
 *   background="rounded"  — amber rounded-square tile, white mark (default)
 *   background="flat"     — amber flat square (icon generation)
 *   background="none"     — mark only, colour from `color` prop
 */
import Svg, { Path, Rect } from 'react-native-svg';

interface LogoProps {
  size?: number;
  /** Mark colour in background="none" mode. Defaults to amber. */
  color?: string;
  background?: 'rounded' | 'flat' | 'none';
  /** Background tile colour. Defaults to amber. */
  bgColor?: string;
}

// Bold T with upward-arrow peak at crossbar centre, on a 100×100 canvas.
// Arrow peak sits at y=18; crossbar band is y=40→58; stem is x=36→64, y=58→90.
const T_PATH =
  'M 8,40 L 36,40 L 50,18 L 64,40 L 92,40 L 92,58 L 64,58 L 64,90 L 36,90 L 36,58 L 8,58 Z';

const AMBER = '#D97706';

export function Logo({
  size = 64,
  color,
  background = 'rounded',
  bgColor = AMBER,
}: LogoProps) {
  const rx = Math.round(size * 0.22); // ~22% → natural rounded-square
  const markFill = background === 'none' ? (color ?? AMBER) : '#FFFFFF';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {background === 'rounded' && (
        <Rect x="0" y="0" width="100" height="100" rx={rx} ry={rx} fill={bgColor} />
      )}
      {background === 'flat' && (
        <Rect x="0" y="0" width="100" height="100" rx="0" ry="0" fill={bgColor} />
      )}
      <Path d={T_PATH} fill={markFill} />
    </Svg>
  );
}
