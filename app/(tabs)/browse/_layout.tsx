import { Stack } from 'expo-router';

import { useTheme } from '@/lib/useTheme';

export default function BrowseLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        animation: 'none',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Discover', headerShown: false }} />
      <Stack.Screen name="[trainerId]" options={{ title: 'Trainer Profile' }} />
      <Stack.Screen name="quiz" options={{ title: 'Find Your Match', presentation: 'modal' }} />
    </Stack>
  );
}
