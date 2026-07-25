import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { DiaryEntry } from '../types';
import { db } from '../lib/firebase';
import { isOnline, withTimeout, diaryToDb, dbToDiary } from '../lib/syncService';
import { uploadPhoto } from '../lib/photoStorage';
import { COLLECTIONS } from '../lib/database.types';

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
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
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

// ローカル写真があれば Storage にアップロードし、URL を差し替えた entry を返す
async function withUploadedPhoto(
  entry: DiaryEntry,
  userId: string
): Promise<DiaryEntry> {
  if (entry.photoUri && entry.photoUri.startsWith('file://')) {
    const url = await uploadPhoto(userId, 'diary', entry.id, entry.photoUri);
    if (url) return { ...entry, photoUri: url };
  }
  return entry;
}

export async function getDiaryEntries(userId: string): Promise<DiaryEntry[]> {
  const online = await isOnline();

  if (online) {
    try {
      const snapshot = await withTimeout(
        getDocs(
          query(
            collection(db, COLLECTIONS.diaryEntries),
            where('userId', '==', userId)
          )
        )
      );
      const entries = snapshot.docs
        .map((d) => dbToDiary(d.data()))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
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
      const toSave = await withUploadedPhoto(updatedEntry, userId);
      await withTimeout(
        setDoc(
          doc(db, COLLECTIONS.diaryEntries, entry.id),
          diaryToDb(toSave, userId)
        )
      );
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
      await withTimeout(deleteDoc(doc(db, COLLECTIONS.diaryEntries, id)));
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
  // 同期先に到達できないときは試行しない
  if (!(await isOnline())) return;
  diarySyncInProgress = true;

  try {
    const json = await AsyncStorage.getItem(PENDING_DIARY_OPS_KEY);
    if (!json) return;

    const ops: PendingOp[] = JSON.parse(json);

    for (const op of ops) {
      try {
        if (op.type === 'delete') {
          await withTimeout(
            deleteDoc(doc(db, COLLECTIONS.diaryEntries, op.entry.id))
          );
        } else {
          const toSave = await withUploadedPhoto(op.entry, userId);
          await withTimeout(
            setDoc(
              doc(db, COLLECTIONS.diaryEntries, op.entry.id),
              diaryToDb(toSave, userId)
            )
          );
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
