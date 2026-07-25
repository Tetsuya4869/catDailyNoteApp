import * as FileSystem from 'expo-file-system';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from './firebase';
import { withTimeout } from './syncService';

export type PhotoEntityType = 'cats' | 'diary';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
// 写真は本文より重いので、既定より長めの上限を許容する
const UPLOAD_TIMEOUT_MS = 30000;

export class PhotoSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoSizeError';
  }
}

// ローカル写真を Firebase Storage にアップロードし、ダウンロード URL を返す。
// 返された URL をそのまま photoUri として Firestore に保存する。
export async function uploadPhoto(
  userId: string,
  entityType: PhotoEntityType,
  entityId: string,
  localUri: string
): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      console.error('Photo file does not exist:', localUri);
      return null;
    }

    if (fileInfo.size && fileInfo.size > MAX_PHOTO_SIZE_BYTES) {
      throw new PhotoSizeError('写真サイズが大きすぎます（5MB以下にしてください）');
    }

    const timestamp = Date.now();
    const storagePath = `${userId}/${entityType}/${entityId}_${timestamp}.jpg`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const storageRef = ref(storage, storagePath);
    await withTimeout(
      uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }),
      UPLOAD_TIMEOUT_MS
    );

    return await withTimeout(getDownloadURL(storageRef), UPLOAD_TIMEOUT_MS);
  } catch (err) {
    console.error('Photo upload exception:', err);
    return null;
  }
}

// photoUri（https のダウンロード URL）から Storage 上のオブジェクトを削除する
export async function deletePhoto(photoUrl: string): Promise<boolean> {
  try {
    await withTimeout(deleteObject(ref(storage, photoUrl)));
    return true;
  } catch (err) {
    console.error('Photo delete failed:', err);
    return false;
  }
}
