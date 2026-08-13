import * as FileSystem from 'expo-file-system';

const MEDIA_DIR = `${FileSystem.documentDirectory}cat-diary-media/`;

async function ensureMediaDir() {
  const info = await FileSystem.getInfoAsync(MEDIA_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
  }
}

function extensionFromUri(uri: string): string {
  const clean = uri.split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() || 'jpg';
}

export async function persistPickedMedia(uri?: string): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith(MEDIA_DIR)) return uri;

  await ensureMediaDir();
  const ext = extensionFromUri(uri);
  const target = `${MEDIA_DIR}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

export async function removeManagedMedia(uri?: string): Promise<void> {
  if (!uri || !uri.startsWith(MEDIA_DIR)) return;
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
}

export type BackupMedia = {
  filename: string;
  base64: string;
};

export async function encodeMedia(uri?: string): Promise<BackupMedia | undefined> {
  if (!uri) return undefined;

  let readableUri = uri;
  let temporaryUri: string | undefined;

  if (/^https?:\/\//.test(uri)) {
    const ext = extensionFromUri(uri);
    temporaryUri = `${FileSystem.cacheDirectory}cat-diary-backup-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const download = await FileSystem.downloadAsync(uri, temporaryUri);
      if (download.status < 200 || download.status >= 300) return undefined;
      readableUri = download.uri;
    } catch {
      return undefined;
    }
  }

  try {
    const info = await FileSystem.getInfoAsync(readableUri);
    if (!info.exists) return undefined;
    return {
      filename: uri.split('?')[0].split('/').pop() || `photo-${Date.now()}.jpg`,
      base64: await FileSystem.readAsStringAsync(readableUri, { encoding: FileSystem.EncodingType.Base64 }),
    };
  } finally {
    if (temporaryUri) {
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
    }
  }
}

export async function restoreMedia(media?: BackupMedia): Promise<string | undefined> {
  if (!media?.base64) return undefined;
  await ensureMediaDir();
  const safeName = media.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const target = `${MEDIA_DIR}${Date.now()}-${safeName}`;
  await FileSystem.writeAsStringAsync(target, media.base64, { encoding: FileSystem.EncodingType.Base64 });
  return target;
}
