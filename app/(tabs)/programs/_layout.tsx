import { Stack } from 'expo-router';

export default function ProgramsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Programs' }} />
      <Stack.Screen name="[id]" options={{ title: 'Program' }} />
    </Stack>
  );
}
