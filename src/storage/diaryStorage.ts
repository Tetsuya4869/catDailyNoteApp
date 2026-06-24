import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiaryEntry } from '../types';
import { supabase } from '../lib/supabase';
import { isOnline, diaryToDb, dbToDiary } from '../lib/syncService';
import { uploadPhoto } from '../lib/photoStorage';
import { DbDiaryEntry } from '../lib/database.types';

const DIARY_STORAGE_KEY = '@cat_diary_entries';
const PENDING_DIARY_OPS_KEY = '@cat_diary_pending_diary_ops';

let diarySyncInProgress = false;

type PendingOp = {
  id: string;
  type: 'upsert' | 'delete';
  entry: DiaryEntry;
  timestamp: string;
};

async function getCachedEntries(): Promise<DiaryEntry[]> {
  const json = await AsyncStorage.getItem(DIARY_STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

async function setCachedEntries(entries: DiaryEntry[]): Promise<void> {
  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
}

function generateOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function addPendingOp(op: Omit<PendingOp, 'id'>): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_DIARY_OPS_KEY);
  const ops: PendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.entry.id !== op.entry.id);
  filtered.push({ ...op, id: generateOpId() });
  await AsyncStorage.setItem(PENDING_DIARY_OPS_KEY, JSON.stringify(filtered));
}

async function removePendingOpById(opId: string): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_DIARY_OPS_KEY);
  if (!json) return;
  const ops: PendingOp[] = JSON.parse(json);
  const filtered = ops.filter((o) => o.id !== opId);
  await AsyncStorage.setItem(PENDING_DIARY_OPS_KEY, JSON.stringify(filtered));
}

export async function getDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  const online = await isOnline();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      const entries = (data as DbDiaryEntry[] || []).map(dbToDiary);
      await setCachedEntries(entries);
      return entries;
    } catch (err) {
      console.error('Failed to fetch diary entries:', err);
    }
  }

  return getCachedEntries();
}

export async function saveDiaryEntry(entry: DiaryEntry, userId: string): Promise<void> {
  const entries = await getCachedEntries();
  const existingIndex = entries.findIndex((e) => e.id === entry.id);

  const updatedEntry = { ...entry, updatedAt: new Date().toISOString() };

  if (existingIndex >= 0) {
    entries[existingIndex] = updatedEntry;
  } else {
    entries.unshift(updatedEntry);
  }
  await setCachedEntries(entries);

  const online = await isOnline();

  if (online) {
    try {
      let photoPath: string | null = null;
      if (entry.photoUri && entry.photoUri.startsWith('file://')) {
        photoPath = await uploadPhoto(userId, 'diary', entry.id, entry.photoUri);
      }

      const dbEntry = diaryToDb(updatedEntry, userId);
      const insertData = photoPath ? { ...dbEntry, photo_path: photoPath } : dbEntry;

      const { error } = await supabase.from('diary_entries').upsert(insertData);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save diary entry:', err);
      await addPendingOp({ type: 'upsert', entry: updatedEntry, timestamp: new Date().toISOString() });
    }
  } else {
    await addPendingOp({ type: 'upsert', entry: updatedEntry, timestamp: new Date().toISOString() });
  }
}

export async function deleteDiaryEntry(id: string, userId: string): Promise<void> {
  const entries = await getCachedEntries();
  const entry = entries.find((e) => e.id === id);
  const filtered = entries.filter((e) => e.id !== id);
  await setCachedEntries(filtered);

  const online = await isOnline();

  if (online) {
    try {
      const { error } = await supabase.from('diary_entries').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete diary entry:', err);
      if (entry) {
        await addPendingOp({ type: 'delete', entry, timestamp: new Date().toISOString() });
      }
    }
  } else if (entry) {
    await addPendingOp({ type: 'delete', entry, timestamp: new Date().toISOString() });
  }
}

export async function getDiaryEntryById(id: string): Promise<DiaryEntry | null> {
  const entries = await getCachedEntries();
  return entries.find((e) => e.id === id) || null;
}

export function calculateStreak(entries: DiaryEntry[]): number {
  if (entries.length === 0) return 0;

  const dates = new Set(entries.map((e) => e.date.slice(0, 10)));

  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);

  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export async function syncPendingDiaryOps(userId: string): Promise<void> {
  if (diarySyncInProgress) return;
  diarySyncInProgress = true;

  try {
    const json = await AsyncStorage.getItem(PENDING_DIARY_OPS_KEY);
    if (!json) return;

    const ops: PendingOp[] = JSON.parse(json);

    for (const op of ops) {
      try {
        if (op.type === 'delete') {
          await supabase.from('diary_entries').delete().eq('id', op.entry.id);
        } else {
          let photoPath: string | null = null;
          if (op.entry.photoUri && op.entry.photoUri.startsWith('file://')) {
            photoPath = await uploadPhoto(userId, 'diary', op.entry.id, op.entry.photoUri);
          }
          const dbEntry = diaryToDb(op.entry, userId);
          const insertData = photoPath ? { ...dbEntry, photo_path: photoPath } : dbEntry;
          await supabase.from('diary_entries').upsert(insertData);
        }
        await removePendingOpById(op.id);
      } catch (err) {
        console.error('Sync failed for diary op:', op.id, err);
      }
    }
  } finally {
    diarySyncInProgress = false;
  }
}
