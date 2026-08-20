import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

/**
 * Global TrainerHub canvas.
 * Deliberately quiet: white remains dominant while cool blue/lavender
 * undertones keep large screens from feeling flat or sterile.
 */
export function AppCanvas() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="appCanvas" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.42" stopColor="#FCFDFF" />
            <Stop offset="0.72" stopColor="#F7FAFF" />
            <Stop offset="1" stopColor="#FBF9FF" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#appCanvas)" />
      </Svg>
    </View>
  );
}
