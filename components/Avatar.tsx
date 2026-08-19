import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { avatarSwatch } from '@/lib/theme';

interface AvatarProps {
  seed: string;
  size?: number;
  initial?: string;
  imageUrl?: string | null;
}

export function Avatar({ seed, size = 40, initial, imageUrl }: AvatarProps) {
  const { bg, fg } = avatarSwatch(seed);
  const letter = (initial ?? seed).charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.42);
  const borderRadius = size / 2;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius, backgroundColor: bg }}
        contentFit="cover"
        transition={140}
        accessibilityLabel={`${initial ?? seed} profile photo`}
      />
    );
  }

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
