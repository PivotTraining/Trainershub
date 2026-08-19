interface SessionEvent {
  title: string;
  startsAt: string | Date;
  durationMin: number;
  notes?: string | null;
  location?: string | null;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Browser calendar export.
 *
 * Native builds use expo-calendar. Web browsers receive a standards-based
 * .ics file instead, which can be opened by Apple Calendar, Google Calendar,
 * Outlook, and most other calendar clients without native permissions.
 */
export async function addSessionToDeviceCalendar(s: SessionEvent): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  const start = typeof s.startsAt === 'string' ? new Date(s.startsAt) : s.startsAt;
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start.getTime() + s.durationMin * 60_000);
  const uid = `trainerhub-${start.getTime()}-${Math.random().toString(36).slice(2)}@trainershub.app`;
  const description = s.notes ? escapeIcs(s.notes) : 'TrainerHub session';
  const location = s.location ? `LOCATION:${escapeIcs(s.location)}\r\n` : '';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrainerHub//Session Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcs(s.title)}`,
    `DESCRIPTION:${description}`,
    location.trimEnd(),
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    'DESCRIPTION:TrainerHub session starts in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `trainerhub-${start.toISOString().slice(0, 10)}.ics`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  return uid;
}
