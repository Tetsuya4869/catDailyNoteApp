import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../types';
import { normalizeDateOnly, shiftDateOnly, todayDateOnly } from '../utils/date';

export const DIARY_STORAGE_KEY = '@cat_diary_entries';

function normalizeEntry(entry: DiaryEntry): DiaryEntry {
  return {
    ...entry,
    date: normalizeDateOnly(entry.date) ?? todayDateOnly(),
  };
}

export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const json = await AsyncStorage.getItem(DIARY_STORAGE_KEY);
  if (!json) return [];

  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];

    const entries = parsed.map((entry) => normalizeEntry(entry as DiaryEntry));
    const migrated = entries.some((entry, index) => entry.date !== parsed[index]?.date);
    if (migrated) {
      await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
    }
    return entries;
  } catch {
    return [];
  }
}

export async function saveDiaryEntries(entries: DiaryEntry[]): Promise<void> {
  await AsyncStorage.setItem(
    DIARY_STORAGE_KEY,
    JSON.stringify(entries.map(normalizeEntry))
  );
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<void> {
  const entries = await getDiaryEntries();
  const normalized = normalizeEntry(entry);
  const existingIndex = entries.findIndex((e) => e.id === normalized.id);

  if (existingIndex >= 0) {
    // updatedAt is owned by the application layer. Preserving the supplied value
    // avoids mutating timestamps when a record is restored or synced from remote.
    entries[existingIndex] = normalized;
  } else {
    entries.unshift(normalized);
  }

  await saveDiaryEntries(entries);
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const entries = await getDiaryEntries();
  await saveDiaryEntries(entries.filter((e) => e.id !== id));
}

export async function getDiaryEntryById(id: string): Promise<DiaryEntry | null> {
  const entries = await getDiaryEntries();
  return entries.find((e) => e.id === id) || null;
}

export function calculateStreak(entries: DiaryEntry[], now: Date = new Date()): number {
  if (entries.length === 0) return 0;

  const dates = new Set(
    entries
      .map((entry) => normalizeDateOnly(entry.date))
      .filter((date): date is string => Boolean(date))
  );

  let cursor = todayDateOnly(now);
  let streak = 0;

  if (!dates.has(cursor)) {
    cursor = shiftDateOnly(cursor, -1);
  }

  while (cursor && dates.has(cursor)) {
    streak += 1;
    cursor = shiftDateOnly(cursor, -1);
  }

  return streak;
}
