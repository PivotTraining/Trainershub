/**
 * Responsive JS-rendered navigation.
 *
 * Phones keep the five-item bottom bar that avoids the iOS native tab-bar
 * hit-test regression. Wider browser windows use the same routes as a left
 * sidebar so TrainerHub feels like a desktop SaaS product instead of a
 * stretched phone app.
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
  availability: 'time-outline',
  programs: 'list-outline',
  packages: 'layers-outline',
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
  availability: 'Availability',
  programs: 'Programs',
  packages: 'Packages',
  corporate: 'Corporate',
  profile: 'Profile',
};

interface TabBarExtraProps {
  visibleRouteNames: readonly string[];
  sidebar?: boolean;
}

export function TabBar({
  state,
  navigation,
  visibleRouteNames,
  sidebar = false,
}: BottomTabBarProps & TabBarExtraProps) {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleRoutes = visibleRouteNames
    .map((name) => state.routes.find((r) => r.name === name))
    .filter((r): r is typeof state.routes[number] => r !== undefined);

  return (
    <View
      style={[
        styles.bar,
        sidebar ? styles.sidebar : styles.bottomBar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingBottom: sidebar
            ? Math.max(insets.bottom, 16)
            : Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 8),
        },
      ]}
    >
      {sidebar && (
        <View style={[styles.brand, { borderBottomColor: colors.border }]}>
          <View style={[styles.brandMark, { backgroundColor: accent }]}>
            <Text style={styles.brandMarkText}>T</Text>
          </View>
          <View>
            <Text style={[styles.brandName, { color: colors.ink }]}>TrainerHub</Text>
            <Text style={[styles.brandSub, { color: colors.muted }]}>Training marketplace</Text>
          </View>
        </View>
      )}

      <View style={sidebar ? styles.sidebarItems : styles.bottomItems}>
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
                sidebar ? styles.sidebarItem : styles.bottomItem,
                sidebar && focused ? { backgroundColor: colors.surfaceRaised } : null,
                pressed ? { opacity: 0.72 } : null,
              ]}
              hitSlop={sidebar ? 0 : 8}
            >
              <Ionicons name={iconName} size={sidebar ? 20 : 22} color={tint} />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  sidebar ? styles.sidebarLabel : styles.bottomLabel,
                  { color: sidebar && focused ? colors.ink : tint },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#fff',
  },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  sidebar: {
    width: 236,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 18,
    paddingHorizontal: 12,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 18,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
  },
  brandSub: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '500',
  },
  bottomItems: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarItems: {
    gap: 4,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomItem: {
    flex: 1,
    paddingVertical: 4,
    gap: 2,
  },
  sidebarItem: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  label: {
    fontWeight: '600',
  },
  bottomLabel: {
    fontSize: 11,
  },
  sidebarLabel: {
    flexShrink: 1,
    fontSize: 14,
  },
});
