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

export function timeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function normalizeClockTime(value: string): string | null {
  const totalMinutes = timeToMinutes(value);
  if (totalMinutes === null) return null;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:00`;
}

export function validateAvailabilityRange(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  existingSlots: AvailabilitySlot[],
): BookingTimeValidation {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) {
    return { valid: false, message: 'Enter a valid 24-hour time such as 09:00 or 17:30.' };
  }
  if (start >= end) {
    return { valid: false, message: 'Start time must be before end time.' };
  }

  const overlaps = existingSlots.some((slot) => {
    if (slot.day_of_week !== dayOfWeek) return false;
    const existingStart = timeToMinutes(slot.start_time);
    const existingEnd = timeToMinutes(slot.end_time);
    return existingStart !== null && existingEnd !== null && start < existingEnd && existingStart < end;
  });
  if (overlaps) {
    return { valid: false, message: 'This time overlaps availability already published for that day.' };
  }

  return { valid: true };
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
