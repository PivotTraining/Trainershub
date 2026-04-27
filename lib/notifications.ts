import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Session } from './types';

// Configure how notifications appear while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request permission. Returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Notification identifier stored per session: `session-reminder-<id>` */
function reminderId(sessionId: string): string {
  return `session-reminder-${sessionId}`;
}

/**
 * Schedule a local notification 60 minutes before the session starts.
 * Safe to call multiple times — cancels any existing reminder first.
 * Does nothing if the trigger time is already in the past.
 */
export async function scheduleSessionReminder(session: Session): Promise<void> {
  // Cancel stale reminder for the same session first
  await cancelSessionReminder(session.id);

  if (session.status !== 'scheduled') return;

  const triggerMs = new Date(session.starts_at).getTime() - 60 * 60 * 1000;
  if (triggerMs <= Date.now()) return; // already past, skip

  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(session.id),
    content: {
      title: 'Session in 1 hour',
      body: `Your ${session.duration_min}-min session starts at ${new Date(
        session.starts_at,
      ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
      data: { sessionId: session.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerMs),
    },
  });
}

/** Cancel the reminder for a session (call when canceled or deleted). */
export async function cancelSessionReminder(sessionId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId(sessionId));
  } catch {
    // Ignore — notification may not exist
  }
}
