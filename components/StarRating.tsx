import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

interface StarRatingProps {
  rating: number;
  size?: number;
  color?: string;
}

export function StarRating({ rating, size = 14, color = '#F59E0B' }: StarRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const position = i + 1;
    if (rating >= position) {
      return 'star' as const;
    }
    if (rating >= position - 0.5) {
      return 'star-half' as const;
    }
    return 'star-outline' as const;
  });

  return (
    <View style={styles.row}>
      {stars.map((iconName, index) => (
        <Ionicons key={index} name={iconName} size={size} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
