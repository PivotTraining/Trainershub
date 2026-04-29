import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  const isTrainer = profile?.role === 'trainer';

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#111' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />

      {/* ── Client: Discover trainers ─────────────────────────────────── */}
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Discover',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: (!isTrainer ? '/(tabs)/browse' : null) as any,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
          headerShown: false,
        }}
      />

      {/* ── Client: My bookings ───────────────────────────────────────── */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: (!isTrainer ? '/(tabs)/bookings' : null) as any,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />

      {/* ── Client: Progress journal ──────────────────────────────────── */}
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: (!isTrainer ? '/(tabs)/journal' : null) as any,
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} />,
        }}
      />

      {/* ── Trainer: Clients ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          href: isTrainer ? '/(tabs)/clients' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />

      {/* ── Trainer: Booking requests ─────────────────────────────────── */}
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: (isTrainer ? '/(tabs)/requests' : null) as any,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} />,
        }}
      />

      {/* ── Shared: Schedule ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />

      {/* ── Shared: Programs ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />,
        }}
      />

      {/* ── Shared: Packages ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="packages"
        options={{
          title: 'Packages',
          tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={size} />,
        }}
      />

      {/* ── Trainer: Availability ────────────────────────────────────── */}
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Availability',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: (isTrainer ? '/(tabs)/availability' : null) as any,
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />

      {/* ── Profile ──────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
