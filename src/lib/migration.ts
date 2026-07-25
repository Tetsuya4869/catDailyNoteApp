import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Cat, DiaryEntry, HealthRecord, Appointment } from '../types';
import {
  catToDb,
  diaryToDb,
  healthToDb,
  appointmentToDb,
  withTimeout,
} from './syncService';
import { uploadPhoto } from './photoStorage';
import { COLLECTIONS } from './database.types';

const MIGRATION_DONE_KEY = '@cat_diary_migration_done';

const LEGACY_CATS_KEY = '@cat_diary_cats';
const LEGACY_DIARY_KEY = '@cat_diary_entries';
const LEGACY_HEALTH_KEY = '@cat_diary_health';
const LEGACY_APPOINTMENTS_KEY = '@cat_diary_appointments';

export async function isMigrationNeeded(): Promise<boolean> {
  const done = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
  if (done === 'true') return false;

  const [cats, diary, health, appts] = await Promise.all([
    AsyncStorage.getItem(LEGACY_CATS_KEY),
    AsyncStorage.getItem(LEGACY_DIARY_KEY),
    AsyncStorage.getItem(LEGACY_HEALTH_KEY),
    AsyncStorage.getItem(LEGACY_APPOINTMENTS_KEY),
  ]);

  return !!(cats || diary || health || appts);
}

export type MigrationResult = {
  success: boolean;
  migrated: { cats: number; diary: number; health: number; appointments: number };
  errors: string[];
};

export async function migrateLocalData(userId: string): Promise<MigrationResult> {
  const errors: string[] = [];
  const migrated = { cats: 0, diary: 0, health: 0, appointments: 0 };

  try {
    // 1. 猫を先に移行（他エンティティが参照するため）
    const catsJson = await AsyncStorage.getItem(LEGACY_CATS_KEY);
    if (catsJson) {
      const cats: Cat[] = JSON.parse(catsJson);
      for (const cat of cats) {
        try {
          let toSave = cat;
          if (cat.photoUri && cat.photoUri.startsWith('file://')) {
            const url = await uploadPhoto(userId, 'cats', cat.id, cat.photoUri);
            if (url) toSave = { ...cat, photoUri: url };
          }
          await withTimeout(
            setDoc(doc(db, COLLECTIONS.cats, cat.id), catToDb(toSave, userId))
          );
          migrated.cats++;
        } catch (err) {
          errors.push(`Cat ${cat.name}: ${err}`);
        }
      }
    }

    // 2. 日記を移行
    const diaryJson = await AsyncStorage.getItem(LEGACY_DIARY_KEY);
    if (diaryJson) {
      const entries: DiaryEntry[] = JSON.parse(diaryJson);
      for (const entry of entries) {
        try {
          let toSave = entry;
          if (entry.photoUri && entry.photoUri.startsWith('file://')) {
            const url = await uploadPhoto(userId, 'diary', entry.id, entry.photoUri);
            if (url) toSave = { ...entry, photoUri: url };
          }
          await withTimeout(
            setDoc(
              doc(db, COLLECTIONS.diaryEntries, entry.id),
              diaryToDb(toSave, userId)
            )
          );
          migrated.diary++;
        } catch (err) {
          errors.push(`Diary "${entry.title}": ${err}`);
        }
      }
    }

    // 3. 健康記録を移行
    const healthJson = await AsyncStorage.getItem(LEGACY_HEALTH_KEY);
    if (healthJson) {
      const records: HealthRecord[] = JSON.parse(healthJson);
      for (const record of records) {
        try {
          await withTimeout(
            setDoc(
              doc(db, COLLECTIONS.healthRecords, record.id),
              healthToDb(record, userId)
            )
          );
          migrated.health++;
        } catch (err) {
          errors.push(`Health record ${record.id}: ${err}`);
        }
      }
    }

    // 4. 予定を移行
    const apptsJson = await AsyncStorage.getItem(LEGACY_APPOINTMENTS_KEY);
    if (apptsJson) {
      const appts: Appointment[] = JSON.parse(apptsJson);
      for (const appt of appts) {
        try {
          await withTimeout(
            setDoc(
              doc(db, COLLECTIONS.appointments, appt.id),
              appointmentToDb(appt, userId)
            )
          );
          migrated.appointments++;
        } catch (err) {
          errors.push(`Appointment "${appt.title}": ${err}`);
        }
      }
    }

    if (errors.length === 0) {
      await AsyncStorage.setItem(MIGRATION_DONE_KEY, 'true');
    }

    return { success: errors.length === 0, migrated, errors };
  } catch (err) {
    return { success: false, migrated, errors: [`Migration failed: ${err}`] };
  }
}
