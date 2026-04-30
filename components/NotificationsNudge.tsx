/**
 * NotificationsNudge — soft banner that prompts the user to enable push
 * notifications if they haven't yet.  Hidden once they grant permission or
 * explicitly dismiss it (stored in AsyncStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { requestNotificationPermission } from '@/lib/notifications';
import { useTheme } from '@/lib/useTheme';

const DISMISS_KEY = '@trainerhub:notifications_nudge_dismissed';

export function NotificationsNudge() {
  const { colors, accent } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
      if (dismissed) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') setVisible(true);
    })().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    if (granted) setVisible(false);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  return (
    <View style={[styles.banner, { backgroundColor: accent }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>🔔 Don&apos;t miss a session</Text>
        <Text style={styles.body}>
          Turn on notifications and we&apos;ll remind you 60 min before each session.
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={handleEnable}>
          <Text style={styles.btnText}>Enable</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDismiss}>
          <Text style={[styles.dismiss, { color: 'rgba(255,255,255,0.75)' }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  body:    { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2, lineHeight: 16 },
  actions: { alignItems: 'flex-end', gap: 6 },
  btn:     {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  dismiss: { fontSize: 11, fontWeight: '500' },
});
