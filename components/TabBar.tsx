/**
 * TabBar — JS-rendered bottom tab bar.
 *
 * Replaces the default native UITabBarController-backed bar that
 * react-native-screens 4.x ships. On real iPad / iPhone hardware running
 * iOS 26.4 the native bar has been observed to render but ignore taps after
 * sign-in (cause of multiple App Review rejections under Guideline 2.1(a)).
 *
 * This component is plain RN — Pressable, View, Text — so taps go through
 * the standard React Native responder system and aren't subject to the
 * native tab-bar bug.
 *
 * The set of visible tabs is computed by the layout (which has the role
 * context) and passed in as `visibleRouteNames`. Anything not in that list
 * is omitted from the bar even if expo-router still routes to it.
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/useTheme';

const ICON_BY_ROUTE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  browse: 'search',
  bookings: 'calendar-outline',
  journal: 'book-outline',
  clients: 'people',
  requests: 'notifications-outline',
  schedule: 'calendar',
  corporate: 'business-outline',
  profile: 'person',
};

const LABEL_BY_ROUTE: Record<string, string> = {
  index: 'Home',
  browse: 'Discover',
  bookings: 'Bookings',
  journal: 'Journal',
  clients: 'Clients',
  requests: 'Requests',
  schedule: 'Schedule',
  corporate: 'Corporate',
  profile: 'Profile',
};

interface TabBarExtraProps {
  visibleRouteNames: readonly string[];
}

export function TabBar({
  state,
  descriptors,
  navigation,
  visibleRouteNames,
}: BottomTabBarProps & TabBarExtraProps) {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  // Render only the routes the layout told us are visible, in the order the
  // layout specified them.
  const visibleRoutes = visibleRouteNames
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is typeof state.routes[number] => r !== undefined);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 8),
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const focused = state.index === state.routes.findIndex((r) => r.key === route.key);
        const iconName = ICON_BY_ROUTE[route.name] ?? 'ellipsis-horizontal';
        const label = LABEL_BY_ROUTE[route.name] ?? route.name;
        const tint = focused ? accent : colors.muted;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            }}
            android_ripple={{ color: colors.borderInput, borderless: false }}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.item,
              pressed && Platform.OS === 'ios' ? { opacity: 0.6 } : null,
            ]}
            hitSlop={8}
          >
            <Ionicons name={iconName} size={22} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
