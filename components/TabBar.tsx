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

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  // Filter out routes that have href: null in their options — those are
  // hidden from the bar but still routable programmatically.
  const visibleRoutes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options;
    // expo-router stores href as a non-standard option; check both the
    // typed `tabBarItemHidden` (newer) and the raw `href` field.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = options;
    if (opts?.href === null) return false;
    if (opts?.tabBarItemHidden) return false;
    return true;
  });

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
