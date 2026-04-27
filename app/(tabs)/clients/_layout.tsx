import { Stack } from 'expo-router';

export default function ClientsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Clients' }} />
      <Stack.Screen name="new" options={{ title: 'Add client', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Client' }} />
    </Stack>
  );
}
