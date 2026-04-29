import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ title: 'Book a Session', presentation: 'modal' }} />
    </Stack>
  );
}
