import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { DiaryEntry } from '../types/DiaryEntry';

const STORAGE_KEY = 'diary_entries';

export async function loadEntries(): Promise<DiaryEntry[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json) as DiaryEntry[];
}

export async function saveEntry(entry: DiaryEntry): Promise<void> {
  const entries = await loadEntries();
  entries.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await loadEntries();
  const target = entries.find((e) => e.id === id);

  if (target) {
    // アプリ内にコピーした写真ファイルを削除
    const fileInfo = await FileSystem.getInfoAsync(target.photoUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(target.photoUri, { idempotent: true });
    }
  }

  const updated = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function copyPhotoToAppDir(uri: string): Promise<string> {
  const dir = FileSystem.documentDirectory + 'photos/';
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const filename = `${Date.now()}.jpg`;
  const dest = dir + filename;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
