import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../types';

const DIARY_STORAGE_KEY = '@cat_diary_entries';

export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const json = await AsyncStorage.getItem(DIARY_STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<void> {
  const entries = await getDiaryEntries();
  const existingIndex = entries.findIndex((e) => e.id === entry.id);

  if (existingIndex >= 0) {
    entries[existingIndex] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    entries.unshift(entry);
  }

  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const entries = await getDiaryEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(filtered));
}

export async function getDiaryEntryById(id: string): Promise<DiaryEntry | null> {
  const entries = await getDiaryEntries();
  return entries.find((e) => e.id === id) || null;
}

export function calculateStreak(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;

  const dates = new Set(
    entries.map((e) => e.date.slice(0, 10))
  );

  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);

  // Allow today to not yet have an entry (check yesterday first if today missing)
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
