import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cat, DiaryEntry, HealthRecord, Appointment } from '../types';
import { DbCat, DbDiaryEntry, DbHealthRecord, DbAppointment } from './database.types';

const SYNC_STATUS_KEY = '@cat_diary_sync_status';

export type SyncStatus = {
  lastSyncAt: string | null;
  hasPendingChanges: boolean;
};

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const json = await AsyncStorage.getItem(SYNC_STATUS_KEY);
  if (!json) return { lastSyncAt: null, hasPendingChanges: false };
  return JSON.parse(json);
}

export async function setSyncStatus(status: SyncStatus): Promise<void> {
  await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

// Firestore は undefined のフィールドを受け付けないため、書き込み前に除去する
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// --- Mappers: App -> Firestore ---

export function catToDb(cat: Cat, userId: string): DbCat {
  return stripUndefined({
    id: cat.id,
    userId,
    name: cat.name,
    color: cat.color,
    gender: cat.gender,
    birthDate: cat.birthDate,
    weightGoal: cat.weightGoal,
    photoUri: cat.photoUri,
    createdAt: cat.createdAt,
  });
}

export function diaryToDb(entry: DiaryEntry, userId: string): DbDiaryEntry {
  return stripUndefined({
    id: entry.id,
    userId,
    catId: entry.catId,
    date: entry.date,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    photoUri: entry.photoUri,
    category: entry.category,
    favorite: entry.favorite ?? false,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  });
}

export function healthToDb(record: HealthRecord, userId: string): DbHealthRecord {
  return stripUndefined({
    id: record.id,
    userId,
    catId: record.catId,
    type: record.type,
    date: record.date,
    weightKg: record.weightKg,
    title: record.title,
    note: record.note,
    createdAt: record.createdAt,
  });
}

export function appointmentToDb(appt: Appointment, userId: string): DbAppointment {
  return stripUndefined({
    id: appt.id,
    userId,
    catId: appt.catId,
    type: appt.type,
    date: appt.date,
    title: appt.title,
    note: appt.note,
    done: appt.done,
  });
}

// --- Mappers: Firestore -> App（型検証つき）---

function isValidDbCat(row: unknown): row is DbCat {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.color === 'string';
}

export function dbToCat(raw: unknown): Cat {
  if (!isValidDbCat(raw)) {
    throw new Error('Invalid cat data from Firestore');
  }
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    color: raw.color,
    gender: raw.gender ?? undefined,
    birthDate: raw.birthDate ?? undefined,
    weightGoal: raw.weightGoal ?? undefined,
    photoUri: raw.photoUri ?? undefined,
    createdAt: raw.createdAt,
  };
}

function isValidDbDiary(row: unknown): row is DbDiaryEntry {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.title === 'string' && typeof r.mood === 'string';
}

export function dbToDiary(raw: unknown): DiaryEntry {
  if (!isValidDbDiary(raw)) {
    throw new Error('Invalid diary data from Firestore');
  }
  return {
    id: raw.id,
    userId: raw.userId,
    catId: raw.catId ?? undefined,
    date: raw.date,
    title: raw.title,
    content: raw.content ?? '',
    mood: raw.mood,
    photoUri: raw.photoUri ?? undefined,
    category: raw.category ?? undefined,
    favorite: raw.favorite ?? false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function isValidDbHealth(row: unknown): row is DbHealthRecord {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.catId === 'string' && typeof r.type === 'string';
}

export function dbToHealth(raw: unknown): HealthRecord {
  if (!isValidDbHealth(raw)) {
    throw new Error('Invalid health record data from Firestore');
  }
  return {
    id: raw.id,
    userId: raw.userId,
    catId: raw.catId,
    type: raw.type,
    date: raw.date,
    weightKg: raw.weightKg ?? undefined,
    title: raw.title ?? undefined,
    note: raw.note ?? undefined,
    createdAt: raw.createdAt,
  };
}

function isValidDbAppointment(row: unknown): row is DbAppointment {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.catId === 'string' && typeof r.title === 'string';
}

export function dbToAppointment(raw: unknown): Appointment {
  if (!isValidDbAppointment(raw)) {
    throw new Error('Invalid appointment data from Firestore');
  }
  return {
    id: raw.id,
    userId: raw.userId,
    catId: raw.catId,
    type: raw.type,
    date: raw.date,
    title: raw.title,
    note: raw.note ?? undefined,
    done: raw.done,
  };
}
