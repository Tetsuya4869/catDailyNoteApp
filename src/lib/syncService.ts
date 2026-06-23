import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cat, DiaryEntry, HealthRecord, Appointment } from '../types';
import { DbCat, DbDiaryEntry, DbHealthRecord, DbAppointment } from './database.types';
import { getPhotoUrl } from './photoStorage';

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

// --- Mappers: App -> DB ---

export function catToDb(cat: Cat, userId: string): Omit<DbCat, 'updated_at'> {
  return {
    id: cat.id,
    user_id: userId,
    name: cat.name,
    color: cat.color,
    gender: cat.gender ?? null,
    birth_date: cat.birthDate ?? null,
    weight_goal: cat.weightGoal ?? null,
    photo_path: null,
    created_at: cat.createdAt,
  };
}

export function dbToCat(db: DbCat): Cat {
  return {
    id: db.id,
    userId: db.user_id,
    name: db.name,
    color: db.color,
    gender: db.gender ?? undefined,
    birthDate: db.birth_date ?? undefined,
    weightGoal: db.weight_goal ?? undefined,
    photoUri: db.photo_path ? getPhotoUrl(db.photo_path) : undefined,
    createdAt: db.created_at,
  };
}

export function diaryToDb(entry: DiaryEntry, userId: string): Omit<DbDiaryEntry, 'updated_at'> {
  return {
    id: entry.id,
    user_id: userId,
    cat_id: entry.catId ?? null,
    date: entry.date.split('T')[0],
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    photo_path: null,
    category: entry.category ?? null,
    favorite: entry.favorite ?? false,
    created_at: entry.createdAt,
  };
}

export function dbToDiary(db: DbDiaryEntry): DiaryEntry {
  return {
    id: db.id,
    userId: db.user_id,
    catId: db.cat_id ?? undefined,
    date: db.date,
    title: db.title,
    content: db.content,
    mood: db.mood,
    photoUri: db.photo_path ? getPhotoUrl(db.photo_path) : undefined,
    category: db.category ?? undefined,
    favorite: db.favorite,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

export function healthToDb(record: HealthRecord, userId: string): DbHealthRecord {
  return {
    id: record.id,
    user_id: userId,
    cat_id: record.catId,
    type: record.type,
    date: record.date.split('T')[0],
    weight_kg: record.weightKg ?? null,
    title: record.title ?? null,
    note: record.note ?? null,
    created_at: record.createdAt,
  };
}

export function dbToHealth(db: DbHealthRecord): HealthRecord {
  return {
    id: db.id,
    userId: db.user_id,
    catId: db.cat_id,
    type: db.type,
    date: db.date,
    weightKg: db.weight_kg ?? undefined,
    title: db.title ?? undefined,
    note: db.note ?? undefined,
    createdAt: db.created_at,
  };
}

export function appointmentToDb(appt: Appointment, userId: string): DbAppointment {
  return {
    id: appt.id,
    user_id: userId,
    cat_id: appt.catId,
    type: appt.type,
    date: appt.date,
    title: appt.title,
    note: appt.note ?? null,
    done: appt.done,
    created_at: new Date().toISOString(),
  };
}

export function dbToAppointment(db: DbAppointment): Appointment {
  return {
    id: db.id,
    userId: db.user_id,
    catId: db.cat_id,
    type: db.type,
    date: db.date,
    title: db.title,
    note: db.note ?? undefined,
    done: db.done,
  };
}
