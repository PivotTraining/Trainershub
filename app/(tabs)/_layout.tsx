import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const { colors, accent } = useTheme();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  const isTrainer = profile?.role === 'trainer';

  // The five visible tabs per role. Anything else (programs, packages,
  // availability) stays routable but is omitted from the bar.
  const visibleRouteNames = isTrainer
    ? (['index', 'clients', 'requests', 'schedule', 'profile'] as const)
    : (['index', 'browse', 'bookings', 'journal', 'profile'] as const);

  return (
    <Tabs
      // Use a JS-rendered tab bar instead of the native UITabBarController.
      // The native bar (react-native-screens 4.16 + iOS 26.4) ships with a
      // hit-test bug on real hardware that leaves bottom-tab buttons
      // unresponsive after sign-in. The custom TabBar uses Pressable so
      // taps go through the standard React Native responder system.
      tabBar={(props) => <TabBar {...props} visibleRouteNames={visibleRouteNames} />}
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
          href: !isTrainer ? '/(tabs)/browse' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} />,
          headerShown: false,
        }}
      />

      {/* ── Client: My bookings ───────────────────────────────────────── */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          href: !isTrainer ? '/(tabs)/bookings' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />

      {/* ── Client: Progress journal ──────────────────────────────────── */}
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          href: !isTrainer ? '/(tabs)/journal' : null,
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
          href: isTrainer ? '/(tabs)/requests' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} />,
        }}
      />

      {/* ── Trainer: Schedule (clients use Bookings tab instead) ─────── */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          href: isTrainer ? '/(tabs)/schedule' : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />

      {/* ── Corporate (hidden from tab bar to keep ≤5 tabs;
              accessible from Profile / direct deep-link) ─────────────── */}
      <Tabs.Screen
        name="corporate"
        options={{
          title: 'Corporate',
          href: null,
          tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" color={color} size={size} />,
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
          href: null,
          title: 'Programs',
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          href: null,
          title: 'Packages',
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          href: null,
          title: 'Availability',
        }}
      />
    </Tabs>
  );
}
