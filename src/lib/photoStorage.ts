import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export type PhotoEntityType = 'cats' | 'diary';

export async function uploadPhoto(
  userId: string,
  entityType: PhotoEntityType,
  entityId: string,
  localUri: string
): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const storagePath = `${userId}/${entityType}/${entityId}_${timestamp}.${ext}`;

    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from('photos')
      .upload(storagePath, decode(base64), {
        contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        upsert: false,
      });

    if (error) {
      console.error('Photo upload error:', error);
      return null;
    }

    return storagePath;
  } catch (err) {
    console.error('Photo upload exception:', err);
    return null;
  }
}

export function getPhotoUrl(photoPath: string): string {
  const { data } = supabase.storage.from('photos').getPublicUrl(photoPath);
  return data.publicUrl;
}

export async function deletePhoto(photoPath: string): Promise<boolean> {
  const { error } = await supabase.storage.from('photos').remove([photoPath]);
  return !error;
}
