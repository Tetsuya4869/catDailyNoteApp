jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { dateOnlyToLocalDate, shiftDateOnly, toDateOnly } from '../date';
import { calculateStreak } from '../../storage/diaryStorage';
import { DiaryEntry } from '../../types';

function entry(id: string, date: string): DiaryEntry {
  return {
    id,
    date,
    title: id,
    content: '',
    mood: 'happy',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
  };
}

describe('date-only helpers', () => {
  it('keeps yyyy-MM-dd values unchanged', () => {
    expect(toDateOnly('2026-08-13')).toBe('2026-08-13');
  });

  it('creates a local calendar date without UTC parsing', () => {
    const date = dateOnlyToLocalDate('2026-08-13');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(13);
  });

  it('shifts across month boundaries', () => {
    expect(shiftDateOnly('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calculates streaks using date-only values', () => {
    const now = new Date(2026, 7, 13, 23, 30);
    expect(calculateStreak([
      entry('a', '2026-08-13'),
      entry('b', '2026-08-12'),
      entry('c', '2026-08-11'),
    ], now)).toBe(3);
  });
});
