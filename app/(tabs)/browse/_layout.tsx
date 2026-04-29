import { Stack } from 'expo-router';

export default function BrowseLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Discover' }} />
      <Stack.Screen name="[trainerId]" options={{ title: 'Trainer Profile' }} />
      <Stack.Screen name="quiz" options={{ title: 'Find Your Match', presentation: 'modal' }} />
    </Stack>
  );
}
