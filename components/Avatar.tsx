/**
 * Avatar — shows an initial letter in a colour determined by the seed string.
 * Passing the same name always produces the same colour, so clients feel
 * personally identified without needing a profile photo.
 */
import { StyleSheet, Text, View } from 'react-native';
import { avatarSwatch } from '@/lib/theme';

interface AvatarProps {
  /** Text used to derive the colour (name, email, or id). */
  seed: string;
  /** Size of the circle in dp. Defaults to 40. */
  size?: number;
  /** Override the displayed letter (defaults to first char of seed). */
  initial?: string;
}

export function Avatar({ seed, size = 40, initial }: AvatarProps) {
  const { bg, fg } = avatarSwatch(seed);
  const letter = (initial ?? seed).charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.42);
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.letter, { fontSize, color: fg }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '700', lineHeight: undefined },
});
