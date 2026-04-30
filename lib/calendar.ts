/**
 * Calendar export — pushes a session/booking into the user's native device
 * calendar (iOS Calendar.app or Android Calendar).  Uses expo-calendar which
 * goes through the system's CalendarKit / ContentResolver APIs, so the event
 * shows up in Apple Calendar, Google Calendar, Outlook (whichever the user
 * has subscribed on the device).
 */
import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

interface SessionEvent {
  title: string;
  startsAt: string | Date;
  durationMin: number;
  notes?: string | null;
  location?: string | null;
}

async function getDefaultCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync().catch(() => null);
    return def?.id ?? null;
  }
  // Android: pick the first writable calendar
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = cals.find((c) => c.allowsModifications);
  return writable?.id ?? null;
}

/**
 * Add a session to the device calendar.  Returns the new event ID, or null
 * if the user denied permission / no writable calendar exists.
 */
export async function addSessionToDeviceCalendar(s: SessionEvent): Promise<string | null> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Calendar permission denied', 'Enable calendar access in Settings to add this session.');
    return null;
  }

  const calId = await getDefaultCalendarId();
  if (!calId) {
    Alert.alert('No calendar found', 'Could not find a writable calendar on this device.');
    return null;
  }

  const start = typeof s.startsAt === 'string' ? new Date(s.startsAt) : s.startsAt;
  const end = new Date(start.getTime() + s.durationMin * 60_000);

  const id = await Calendar.createEventAsync(calId, {
    title: s.title,
    startDate: start,
    endDate: end,
    notes: s.notes ?? undefined,
    location: s.location ?? undefined,
    alarms: [{ relativeOffset: -60 }], // 60-min reminder
  });

  return id;
}
