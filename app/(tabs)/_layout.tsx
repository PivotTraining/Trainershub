import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/useTheme';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  const { colors, accent } = useTheme();
  const { width } = useWindowDimensions();

  if (loading) return null;
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  const isTrainer = profile?.role === 'trainer';
  const useSidebar = Platform.OS === 'web' && width >= 900;

  const mobileRouteNames = isTrainer
    ? (['index', 'clients', 'requests', 'schedule', 'profile-dashboard'] as const)
    : (['index', 'browse', 'bookings', 'journal', 'profile-dashboard'] as const);

  const desktopRouteNames = isTrainer
    ? (['index', 'clients', 'requests', 'schedule', 'availability', 'programs', 'packages', 'corporate', 'integrations', 'profile-dashboard'] as const)
    : (['index', 'browse', 'bookings', 'journal', 'corporate', 'integrations', 'profile-dashboard'] as const);

  const visibleRouteNames = useSidebar ? desktopRouteNames : mobileRouteNames;

  return (
    <Tabs
      detachInactiveScreens={false}
      backBehavior="history"
      tabBar={(props) => <TabBar {...props} visibleRouteNames={visibleRouteNames} sidebar={useSidebar} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarPosition: useSidebar ? 'left' : 'bottom',
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
        freezeOnBlur: false,
        animation: 'none',
        tabBarStyle: useSidebar
          ? { backgroundColor: colors.surface, borderRightColor: colors.border, borderRightWidth: 1, borderTopWidth: 0, width: 236 }
          : { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: useSidebar ? 14 : 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="browse" options={{ title: 'Discover', href: !isTrainer ? '/(tabs)/browse' : null, popToTopOnBlur: true, tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', href: !isTrainer ? '/(tabs)/bookings' : null, tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal', href: !isTrainer ? '/(tabs)/journal' : null, tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', href: isTrainer ? '/(tabs)/clients' : null, tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }} />
      <Tabs.Screen name="requests" options={{ title: 'Requests', href: isTrainer ? '/(tabs)/requests' : null, tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="schedule" options={{ title: 'Schedule', href: isTrainer ? '/(tabs)/schedule' : null, tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }} />
      <Tabs.Screen name="corporate" options={{ title: 'Corporate', href: useSidebar ? '/(tabs)/corporate' : null, tabBarIcon: ({ color, size }) => <Ionicons name="business-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="integrations" options={{ title: 'Integrations', href: useSidebar ? '/(tabs)/integrations' : null, tabBarIcon: ({ color, size }) => <Ionicons name="extension-puzzle-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="profile-dashboard" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Account & Settings', href: null, headerShown: true }} />
      <Tabs.Screen name="personalize" options={{ title: 'Personalize', href: null, headerShown: true }} />
      <Tabs.Screen name="programs" options={{ href: useSidebar && isTrainer ? '/(tabs)/programs' : null, title: 'Programs' }} />
      <Tabs.Screen name="packages" options={{ href: useSidebar && isTrainer ? '/(tabs)/packages' : null, title: 'Packages' }} />
      <Tabs.Screen name="availability" options={{ href: useSidebar && isTrainer ? '/(tabs)/availability' : null, title: 'Availability' }} />
    </Tabs>
  );
}
