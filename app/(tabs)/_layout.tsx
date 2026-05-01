import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const { colors, accent, isDark } = useTheme();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  const isTrainer = profile?.role === 'trainer';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      {/* ── Shared: Home ─────────────────────────────────────────────── */}
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: (isTrainer ? '/(tabs)/clients' : null) as any,
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

      {/* ── Shared: Profile ──────────────────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />

      {/* ── Hidden routes (routing works, not shown in tab bar) ──────── */}
      <Tabs.Screen
        name="programs"
        options={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: null as any,
          title: 'Programs',
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: null as any,
          title: 'Packages',
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          href: null as any,
          title: 'Availability',
        }}
      />
    </Tabs>
  );
}
