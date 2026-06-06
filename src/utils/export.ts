import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDiaryEntries } from '../storage/diaryStorage';
import { format } from 'date-fns';

export async function exportDiaryData(): Promise<boolean> {
  const entries = await getDiaryEntries();

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
