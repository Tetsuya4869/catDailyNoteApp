import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { format } from 'date-fns';
import { Cat, DiaryEntry, HealthRecord, Appointment, CatMood } from '../types';
import { getAllCats, saveCats } from '../storage/catStorage';
import { getDiaryEntries, saveDiaryEntries } from '../storage/diaryStorage';
import {
  getHealthRecords,
  saveHealthRecords,
  getAppointments,
  saveAppointments,
} from '../storage/healthStorage';
import {
  getThemePreference,
  saveThemePreference,
  getReminderSettings,
  saveReminderSettings,
  ThemePreference,
  ReminderSettings,
} from '../storage/settingsStorage';
import { BackupMedia, encodeMedia, restoreMedia } from './media';
import { normalizeDateOnly } from './date';

const BACKUP_VERSION = 2;
const moods: CatMood[] = ['happy', 'sleepy', 'playful', 'hungry', 'relaxed'];

interface BackupV2 {
  schemaVersion: 2;
  exportedAt: string;
  cats: Cat[];
  diaryEntries: DiaryEntry[];
  healthRecords: HealthRecord[];
  appointments: Appointment[];
  settings: {
    theme: ThemePreference;
    reminder: ReminderSettings;
  };
  media: Record<string, BackupMedia>;
}

async function buildMedia(cats: Cat[], entries: DiaryEntry[]) {
  const media: Record<string, BackupMedia> = {};
  for (const cat of cats) {
    const encoded = await encodeMedia(cat.photoUri);
    if (encoded) media[`cat:${cat.id}`] = encoded;
  }
  for (const entry of entries) {
    const encoded = await encodeMedia(entry.photoUri);
    if (encoded) media[`entry:${entry.id}`] = encoded;
  }
  return media;
}

export async function exportDiaryData(): Promise<boolean> {
  const [cats, diaryEntries, healthRecords, appointments, theme, reminder] = await Promise.all([
    getAllCats(),
    getDiaryEntries(),
    getHealthRecords(),
    getAppointments(),
    getThemePreference(),
    getReminderSettings(),
  ]);

  const exportData: BackupV2 = {
    schemaVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cats,
    diaryEntries,
    healthRecords,
    appointments,
    settings: { theme, reminder },
    media: await buildMedia(cats, diaryEntries),
  };

  const fileName = `cat-diary-backup-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: '猫日記の完全バックアップをエクスポート',
    });
  }
  return true;
}

type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function validDate(value: unknown): value is string {
  return isString(value) && Boolean(normalizeDateOnly(value));
}

function isDiaryEntry(value: unknown): value is DiaryEntry {
  if (!isObject(value)) return false;
  return (
    isString(value.id) &&
    validDate(value.date) &&
    isString(value.title) &&
    isString(value.content) &&
    isString(value.mood) &&
    moods.includes(value.mood as CatMood) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    (value.catId == null || isString(value.catId)) &&
    (value.photoUri == null || isString(value.photoUri))
  );
}

function isCat(value: unknown): value is Cat {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.color) &&
    isString(value.createdAt) &&
    (value.birthDate == null || validDate(value.birthDate))
  );
}

function isHealthRecord(value: unknown): value is HealthRecord {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.catId) &&
    isString(value.type) &&
    validDate(value.date) &&
    isString(value.createdAt)
  );
}

function isAppointment(value: unknown): value is Appointment {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.catId) &&
    (value.type === 'vet' || value.type === 'vaccine') &&
    validDate(value.date) &&
    isString(value.title) &&
    typeof value.done === 'boolean'
  );
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]) {
  const ids = new Set(existing.map((item) => item.id));
  const added: T[] = [];
  let skipped = 0;
  for (const item of incoming) {
    if (ids.has(item.id)) skipped += 1;
    else {
      ids.add(item.id);
      added.push(item);
    }
  }
  return { merged: [...existing, ...added], added, skipped };
}

export async function importDiaryData(): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) {
    return { success: false, imported: 0, skipped: 0 };
  }

  const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return { success: false, imported: 0, skipped: 0, error: '無効なJSONファイルです' };
  }
  if (!isObject(raw)) {
    return { success: false, imported: 0, skipped: 0, error: 'バックアップ形式が不正です' };
  }

  // v1（日記のみ）との後方互換。
  if (raw.schemaVersion !== 2) {
    const legacy = Array.isArray(raw.entries) ? raw.entries.filter(isDiaryEntry) : [];
    if (legacy.length === 0) {
      return { success: false, imported: 0, skipped: 0, error: '有効な日記データが見つかりません' };
    }
    const current = await getDiaryEntries();
    const merged = mergeById(current, legacy);
    await saveDiaryEntries(merged.merged);
    return { success: true, imported: merged.added.length, skipped: merged.skipped };
  }

  const cats = Array.isArray(raw.cats) ? raw.cats.filter(isCat) : [];
  const entries = Array.isArray(raw.diaryEntries) ? raw.diaryEntries.filter(isDiaryEntry) : [];
  const health = Array.isArray(raw.healthRecords) ? raw.healthRecords.filter(isHealthRecord) : [];
  const appointments = Array.isArray(raw.appointments) ? raw.appointments.filter(isAppointment) : [];
  const media = isObject(raw.media) ? (raw.media as Record<string, BackupMedia>) : {};

  const [currentCats, currentEntries, currentHealth, currentAppointments] = await Promise.all([
    getAllCats(),
    getDiaryEntries(),
    getHealthRecords(),
    getAppointments(),
  ]);

  const catMerge = mergeById(currentCats, cats);
  const entryMerge = mergeById(currentEntries, entries);
  const healthMerge = mergeById(currentHealth, health);
  const appointmentMerge = mergeById(currentAppointments, appointments);

  const restoredCats = await Promise.all(
    catMerge.merged.map(async (cat) => {
      if (!catMerge.added.some((added) => added.id === cat.id)) return cat;
      const photoUri = await restoreMedia(media[`cat:${cat.id}`]);
      return { ...cat, photoUri: photoUri ?? cat.photoUri };
    })
  );
  const restoredEntries = await Promise.all(
    entryMerge.merged.map(async (entry) => {
      if (!entryMerge.added.some((added) => added.id === entry.id)) return entry;
      const photoUri = await restoreMedia(media[`entry:${entry.id}`]);
      return { ...entry, photoUri: photoUri ?? entry.photoUri };
    })
  );

  await Promise.all([
    saveCats(restoredCats),
    saveDiaryEntries(restoredEntries),
    saveHealthRecords(healthMerge.merged),
    saveAppointments(appointmentMerge.merged),
  ]);

  if (isObject(raw.settings)) {
    if (raw.settings.theme === 'light' || raw.settings.theme === 'dark' || raw.settings.theme === 'system') {
      await saveThemePreference(raw.settings.theme);
    }
    if (isObject(raw.settings.reminder)) {
      const reminder = raw.settings.reminder;
      if (
        typeof reminder.enabled === 'boolean' &&
        typeof reminder.hour === 'number' &&
        typeof reminder.minute === 'number'
      ) {
        await saveReminderSettings({
          enabled: reminder.enabled,
          hour: Math.max(0, Math.min(23, reminder.hour)),
          minute: Math.max(0, Math.min(59, reminder.minute)),
        });
      }
    }
  }

  const imported = catMerge.added.length + entryMerge.added.length + healthMerge.added.length + appointmentMerge.added.length;
  const skipped = catMerge.skipped + entryMerge.skipped + healthMerge.skipped + appointmentMerge.skipped;
  return { success: true, imported, skipped };
}
