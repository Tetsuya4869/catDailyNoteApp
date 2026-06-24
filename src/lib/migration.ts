import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Cat, DiaryEntry, HealthRecord, Appointment } from '../types';
import { catToDb, diaryToDb, healthToDb, appointmentToDb } from './syncService';
import { uploadPhoto } from './photoStorage';

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
    // 1. Migrate cats first (other entities reference them)
    const catsJson = await AsyncStorage.getItem(LEGACY_CATS_KEY);
    if (catsJson) {
      const cats: Cat[] = JSON.parse(catsJson);
      for (const cat of cats) {
        try {
          let photoPath: string | null = null;
          if (cat.photoUri && cat.photoUri.startsWith('file://')) {
            photoPath = await uploadPhoto(userId, 'cats', cat.id, cat.photoUri);
          }
          const dbCat = catToDb(cat, userId);
          const insertData = photoPath ? { ...dbCat, photo_path: photoPath } : dbCat;

          const { error } = await supabase.from('cats').upsert(insertData);
          if (error) throw error;
          migrated.cats++;
        } catch (err) {
          errors.push(`Cat ${cat.name}: ${err}`);
        }
      }
    }

    // 2. Migrate diary entries
    const diaryJson = await AsyncStorage.getItem(LEGACY_DIARY_KEY);
    if (diaryJson) {
      const entries: DiaryEntry[] = JSON.parse(diaryJson);
      for (const entry of entries) {
        try {
          let photoPath: string | null = null;
          if (entry.photoUri && entry.photoUri.startsWith('file://')) {
            photoPath = await uploadPhoto(userId, 'diary', entry.id, entry.photoUri);
          }
          const dbEntry = diaryToDb(entry, userId);
          const insertData = photoPath ? { ...dbEntry, photo_path: photoPath } : dbEntry;

          const { error } = await supabase.from('diary_entries').upsert(insertData);
          if (error) throw error;
          migrated.diary++;
        } catch (err) {
          errors.push(`Diary "${entry.title}": ${err}`);
        }
      }
    }

    // 3. Migrate health records
    const healthJson = await AsyncStorage.getItem(LEGACY_HEALTH_KEY);
    if (healthJson) {
      const records: HealthRecord[] = JSON.parse(healthJson);
      for (const record of records) {
        try {
          const dbRecord = healthToDb(record, userId);
          const { error } = await supabase.from('health_records').upsert(dbRecord);
          if (error) throw error;
          migrated.health++;
        } catch (err) {
          errors.push(`Health record ${record.id}: ${err}`);
        }
      }
    }

    // 4. Migrate appointments
    const apptsJson = await AsyncStorage.getItem(LEGACY_APPOINTMENTS_KEY);
    if (apptsJson) {
      const appts: Appointment[] = JSON.parse(apptsJson);
      for (const appt of appts) {
        try {
          const dbAppt = appointmentToDb(appt, userId);
          const { error } = await supabase.from('appointments').upsert(dbAppt);
          if (error) throw error;
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
