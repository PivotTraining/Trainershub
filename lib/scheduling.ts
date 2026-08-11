import type { AvailabilitySlot } from './types';

export type PickerMode = 'date' | 'time';

/** Preserve the untouched half of a timestamp when a native picker changes. */
export function mergePickerDateTime(current: Date, selected: Date, mode: PickerMode): Date {
  const merged = new Date(current);
  if (mode === 'date') {
    merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  } else {
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  }
  return merged;
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function availabilityForDay(slots: AvailabilitySlot[], date: Date): AvailabilitySlot[] {
  return slots
    .filter((slot) => slot.day_of_week === date.getDay())
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function fitsAvailability(
  start: Date,
  durationMinutes: number,
  slots: AvailabilitySlot[],
): boolean {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return false;
  }

  const requestedStart = start.getHours() * 60 + start.getMinutes();
  const requestedEnd = requestedStart + durationMinutes;
  return availabilityForDay(slots, start).some((slot) => {
    const slotStart = timeToMinutes(slot.start_time);
    const slotEnd = timeToMinutes(slot.end_time);
    return slotStart !== null && slotEnd !== null && requestedStart >= slotStart && requestedEnd <= slotEnd;
  });
}

export type BookingTimeValidation =
  | { valid: true }
  | { valid: false; message: string };

export function validateBookingTime(
  start: Date,
  durationMinutes: number,
  slots: AvailabilitySlot[],
  now = new Date(),
): BookingTimeValidation {
  if (!Number.isFinite(start.getTime())) {
    return { valid: false, message: 'Choose a valid date and time.' };
  }

  const minimumStart = now.getTime() + 15 * 60_000;
  if (start.getTime() < minimumStart) {
    return { valid: false, message: 'Choose a time at least 15 minutes from now.' };
  }

  // An empty schedule means the trainer has not published recurring hours yet.
  // Allow a request, but enforce published hours whenever any exist.
  if (slots.length > 0 && !fitsAvailability(start, durationMinutes, slots)) {
    return {
      valid: false,
      message: 'Choose a time and duration that fit within the trainer’s published availability.',
    };
  }

  return { valid: true };
}

export function validateFutureSessionTime(start: Date, now = new Date()): BookingTimeValidation {
  if (!Number.isFinite(start.getTime())) {
    return { valid: false, message: 'Choose a valid date and time.' };
  }
  if (start.getTime() <= now.getTime()) {
    return { valid: false, message: 'Sessions must be scheduled for a future time.' };
  }
  return { valid: true };
}
