import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

interface EnergyFieldProps {
  opacity?: number;
  flip?: boolean;
}

/**
 * Ambient brand-light ribbons used instead of decorative bubbles.
 * Intentionally abstract: the gradient reads as light passing through space,
 * not as a separate object sitting behind the UI.
 */
export function EnergyField({ opacity = 1, flip = false }: EnergyFieldProps) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, flip && styles.flip]}>
      <Svg width="100%" height="100%" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="energyA" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#A21CFF" stopOpacity={0} />
            <Stop offset="0.36" stopColor="#A21CFF" stopOpacity={0.62 * opacity} />
            <Stop offset="0.72" stopColor="#168BFF" stopOpacity={0.5 * opacity} />
            <Stop offset="1" stopColor="#05BFEA" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="energyB" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#168BFF" stopOpacity={0} />
            <Stop offset="0.4" stopColor="#168BFF" stopOpacity={0.26 * opacity} />
            <Stop offset="0.7" stopColor="#A21CFF" stopOpacity={0.24 * opacity} />
            <Stop offset="1" stopColor="#A21CFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Path
          d="M-120 330 C130 120 310 70 510 170 C690 260 790 290 1120 40"
          fill="none"
          stroke="url(#energyA)"
          strokeWidth="92"
          strokeLinecap="round"
          opacity={0.72}
        />
        <Path
          d="M-100 370 C180 220 390 210 560 245 C720 280 855 240 1110 95"
          fill="none"
          stroke="url(#energyB)"
          strokeWidth="46"
          strokeLinecap="round"
          opacity={0.88}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  flip: { transform: [{ scaleX: -1 }] },
});
