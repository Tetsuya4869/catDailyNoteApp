import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDiaryEntries } from '../storage/diaryStorage';
import { DiaryEntry } from '../types';
import { format } from 'date-fns';

const DIARY_STORAGE_KEY = '@cat_diary_entries';

export async function exportDiaryData(userId: string): Promise<boolean> {
  const entries = await getDiaryEntries(userId);

  if (entries.length === 0) {
    return false;
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    entries,
  };

  const fileName = `cat-diary-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(
    filePath,
    JSON.stringify(exportData, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: '日記データをエクスポート',
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

export async function importDiaryData(userId: string): Promise<ImportResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { success: false, imported: 0, skipped: 0, error: 'キャンセルされました' };
  }

  const fileUri = result.assets[0].uri;

  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let importData: { entries?: DiaryEntry[] };
  try {
    importData = JSON.parse(content);
  } catch {
    return { success: false, imported: 0, skipped: 0, error: '無効なJSONファイルです' };
  }

  if (!importData.entries || !Array.isArray(importData.entries)) {
    return { success: false, imported: 0, skipped: 0, error: '日記データが見つかりません' };
  }

  const existingEntries = await getDiaryEntries(userId);
  const existingIds = new Set(existingEntries.map((e) => e.id));

  let imported = 0;
  let skipped = 0;

  for (const entry of importData.entries) {
    if (existingIds.has(entry.id)) {
      skipped++;
    } else {
      existingEntries.push(entry);
      imported++;
    }
  }

  await AsyncStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(existingEntries));

  return { success: true, imported, skipped };
}
