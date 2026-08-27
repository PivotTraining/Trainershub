/** Responsive TrainerHub navigation with official brand treatment. */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabActions } from '@react-navigation/native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/BrandLockup';
import { useTheme } from '@/lib/useTheme';

const ICON_BY_ROUTE: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home', browse: 'search', bookings: 'calendar-outline', journal: 'book-outline', clients: 'people', requests: 'notifications-outline', schedule: 'calendar', availability: 'time-outline', programs: 'list-outline', packages: 'layers-outline', corporate: 'business-outline', integrations: 'extension-puzzle-outline', profile: 'person', 'profile-dashboard': 'person',
};
const LABEL_BY_ROUTE: Record<string, string> = {
  index: 'Home', browse: 'Discover', bookings: 'Bookings', journal: 'Journal', clients: 'Clients', requests: 'Requests', schedule: 'Schedule', availability: 'Availability', programs: 'Programs', packages: 'Packages', corporate: 'Corporate', integrations: 'Integrations', profile: 'Profile', 'profile-dashboard': 'Profile',
};
interface TabBarExtraProps { visibleRouteNames: readonly string[]; sidebar?: boolean; }

export function TabBar({ state, navigation, visibleRouteNames, sidebar = false }: BottomTabBarProps & TabBarExtraProps) {
  const { colors, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const visibleRoutes = visibleRouteNames.map((name) => state.routes.find((r) => r.name === name)).filter((r): r is typeof state.routes[number] => r !== undefined);

  const openRoute = (route: typeof state.routes[number], focused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focused || event.defaultPrevented) return;
    if (Platform.OS === 'web') {
      navigation.reset({ index: 0, routes: [{ name: route.name, params: route.params }] });
      return;
    }
    navigation.dispatch(TabActions.jumpTo(route.name, route.params));
  };

  return (
    <View style={[styles.bar, sidebar ? styles.sidebar : styles.bottomBar, { backgroundColor: sidebar ? '#07172B' : colors.surface, borderColor: sidebar ? '#18304D' : colors.border, paddingBottom: sidebar ? Math.max(insets.bottom, 16) : Math.max(insets.bottom, Platform.OS === 'ios' ? 6 : 8) }]}>
      {sidebar && <View style={styles.brandPanel}><BrandLockup compact dark /></View>}
      <View style={sidebar ? styles.sidebarItems : styles.bottomItems}>
        {visibleRoutes.map((route) => {
          const focused = state.index === state.routes.findIndex((r) => r.key === route.key);
          const iconName = ICON_BY_ROUTE[route.name] ?? 'ellipsis-horizontal';
          const label = LABEL_BY_ROUTE[route.name] ?? route.name;
          const tint = focused ? (sidebar ? '#FFFFFF' : accent) : (sidebar ? '#8292A8' : colors.muted);
          return (
            <Pressable key={route.key} onPress={() => openRoute(route, focused)} accessibilityRole="button" accessibilityState={focused ? { selected: true } : {}} accessibilityLabel={label} style={({ pressed }) => [styles.item, sidebar ? styles.sidebarItem : styles.bottomItem, sidebar && focused ? styles.sidebarActive : null, pressed ? { transform: [{ scale: 0.985 }], opacity: 0.82 } : null]} hitSlop={sidebar ? 0 : 8}>
              {sidebar && focused ? <View style={[styles.activeRail, { backgroundColor: accent }]} /> : null}
              <Ionicons name={iconName} size={sidebar ? 20 : 22} color={tint} />
              <Text numberOfLines={1} style={[styles.label, sidebar ? styles.sidebarLabel : styles.bottomLabel, { color: tint }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      {sidebar ? <View style={styles.sidebarFooter}><Text style={styles.footerBrand}>BETTER TOGETHER.</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {}, bottomBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 }, sidebar: { width: 236, borderRightWidth: StyleSheet.hairlineWidth, paddingTop: 16, paddingHorizontal: 12 },
  brandPanel: { paddingHorizontal: 7, paddingVertical: 15, marginBottom: 16, borderRadius: 18, backgroundColor: '#0B203A', borderWidth: 1, borderColor: '#183959' },
  bottomItems: { flex: 1, flexDirection: 'row' }, sidebarItems: { gap: 5 }, item: { alignItems: 'center', justifyContent: 'center' }, bottomItem: { flex: 1, paddingVertical: 4, gap: 2 },
  sidebarItem: { width: '100%', minHeight: 46, flexDirection: 'row', justifyContent: 'flex-start', gap: 12, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 13, position: 'relative', overflow: 'hidden' },
  sidebarActive: { backgroundColor: '#122A47' }, activeRail: { position: 'absolute', left: 0, top: 9, bottom: 9, width: 3, borderRadius: 3 }, label: { fontWeight: '700' }, bottomLabel: { fontSize: 11 }, sidebarLabel: { flexShrink: 1, fontSize: 14 },
  sidebarFooter: { marginTop: 'auto', paddingVertical: 14, alignItems: 'center' }, footerBrand: { color: '#5F7188', fontSize: 8, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2.1 },
});
