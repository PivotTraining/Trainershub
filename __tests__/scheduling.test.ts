import {
  availabilityForDay,
  fitsAvailability,
  mergePickerDateTime,
  normalizeClockTime,
  timeToMinutes,
  validateAvailabilityRange,
  validateBookingTime,
  validateFutureSessionTime,
} from '@/lib/scheduling';
import type { AvailabilitySlot } from '@/lib/types';

const mondaySlot: AvailabilitySlot = {
  id: 'slot-1',
  trainer_id: 'trainer-1',
  day_of_week: 1,
  start_time: '09:00:00',
  end_time: '12:00:00',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('scheduling helpers', () => {
  it('changes only the selected date or time component', () => {
    const current = new Date(2026, 7, 10, 9, 30);
    const dateSelection = new Date(2026, 7, 14, 0, 0);
    const timeSelection = new Date(2001, 0, 1, 16, 45);

    expect(mergePickerDateTime(current, dateSelection, 'date')).toEqual(
      new Date(2026, 7, 14, 9, 30),
    );
    expect(mergePickerDateTime(current, timeSelection, 'time')).toEqual(
      new Date(2026, 7, 10, 16, 45),
    );
  });

  it('matches the requested weekday and requires the entire session to fit', () => {
    const monday = new Date(2026, 7, 10, 11, 0);
    const tuesday = new Date(2026, 7, 11, 10, 0);

    expect(availabilityForDay([mondaySlot], monday)).toEqual([mondaySlot]);
    expect(fitsAvailability(monday, 60, [mondaySlot])).toBe(true);
    expect(fitsAvailability(monday, 90, [mondaySlot])).toBe(false);
    expect(fitsAvailability(tuesday, 30, [mondaySlot])).toBe(false);
  });

  it('rejects last-minute and out-of-hours booking requests', () => {
    const now = new Date(2026, 7, 10, 8, 50);

    expect(validateBookingTime(new Date(2026, 7, 10, 9, 0), 30, [], now)).toEqual({
      valid: false,
      message: 'Choose a time at least 15 minutes from now.',
    });
    expect(validateBookingTime(new Date(2026, 7, 10, 12, 0), 30, [mondaySlot], now).valid).toBe(false);
    expect(validateBookingTime(new Date(2026, 7, 10, 10, 0), 60, [mondaySlot], now)).toEqual({
      valid: true,
    });
  });

  it('allows a request when no recurring hours are published and rejects past sessions', () => {
    const now = new Date(2026, 7, 10, 8, 0);
    expect(validateBookingTime(new Date(2026, 7, 10, 10, 0), 60, [], now)).toEqual({ valid: true });
    expect(validateFutureSessionTime(new Date(2026, 7, 10, 7, 59), now).valid).toBe(false);
  });

  it('validates clock input and rejects overlapping recurring availability', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('09:75')).toBeNull();
    expect(normalizeClockTime('9:30')).toBe('09:30:00');

    expect(validateAvailabilityRange(1, '08:00', '09:00', [mondaySlot])).toEqual({ valid: true });
    expect(validateAvailabilityRange(1, '08:30', '09:30', [mondaySlot]).valid).toBe(false);
    expect(validateAvailabilityRange(1, '12:00', '11:00', [mondaySlot]).valid).toBe(false);
    expect(validateAvailabilityRange(2, '09:00', '10:00', [mondaySlot])).toEqual({ valid: true });
  });
});
