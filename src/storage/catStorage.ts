import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cat } from '../types';
import { supabase } from '../lib/supabase';
import { isOnline, catToDb, dbToCat } from '../lib/syncService';
import { uploadPhoto } from '../lib/photoStorage';
import { DbCat } from '../lib/database.types';

const CAT_STORAGE_KEY = '@cat_diary_cats';
const PENDING_CAT_OPS_KEY = '@cat_diary_pending_cat_ops';

type PendingOp = {
  type: 'upsert' | 'delete';
  cat: Cat;
  timestamp: string;
};

async function getCachedCats(): Promise<Cat[]> {
  const json = await AsyncStorage.getItem(CAT_STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

async function setCachedCats(cats: Cat[]): Promise<void> {
  await AsyncStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(cats));
}

async function addPendingOp(op: PendingOp): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_CAT_OPS_KEY);
  const ops: PendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.cat.id !== op.cat.id);
  filtered.push(op);
  await AsyncStorage.setItem(PENDING_CAT_OPS_KEY, JSON.stringify(filtered));
}

export async function getCats(userId: string): Promise<Cat[]> {
  const online = await isOnline();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('cats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const cats = (data as DbCat[] || []).map(dbToCat);
      await setCachedCats(cats);
      return cats;
    } catch (err) {
      console.error('Failed to fetch cats from Supabase:', err);
    }
  }

  return getCachedCats();
}

export async function saveCat(cat: Cat, userId: string): Promise<void> {
  const cats = await getCachedCats();
  const existingIndex = cats.findIndex((c) => c.id === cat.id);

  if (existingIndex >= 0) {
    cats[existingIndex] = cat;
  } else {
    cats.push(cat);
  }
  await setCachedCats(cats);

  const online = await isOnline();

  if (online) {
    try {
      let photoPath: string | null = null;
      if (cat.photoUri && cat.photoUri.startsWith('file://')) {
        photoPath = await uploadPhoto(userId, 'cats', cat.id, cat.photoUri);
      }

      const dbCat = catToDb(cat, userId);
      const insertData = photoPath ? { ...dbCat, photo_path: photoPath } : dbCat;

      const { error } = await supabase.from('cats').upsert(insertData);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save cat to Supabase:', err);
      await addPendingOp({ type: 'upsert', cat, timestamp: new Date().toISOString() });
    }
  } else {
    await addPendingOp({ type: 'upsert', cat, timestamp: new Date().toISOString() });
  }
}

export async function deleteCat(id: string, userId: string): Promise<void> {
  const cats = await getCachedCats();
  const cat = cats.find((c) => c.id === id);
  const filtered = cats.filter((c) => c.id !== id);
  await setCachedCats(filtered);

  const online = await isOnline();

  if (online) {
    try {
      const { error } = await supabase.from('cats').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete cat from Supabase:', err);
      if (cat) {
        await addPendingOp({ type: 'delete', cat, timestamp: new Date().toISOString() });
      }
    }
  } else if (cat) {
    await addPendingOp({ type: 'delete', cat, timestamp: new Date().toISOString() });
  }
}

export async function getCatById(id: string): Promise<Cat | null> {
  const cats = await getCachedCats();
  return cats.find((c) => c.id === id) || null;
}

export async function syncPendingCatOps(userId: string): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_CAT_OPS_KEY);
  if (!json) return;

  const ops: PendingOp[] = JSON.parse(json);
  const remaining: PendingOp[] = [];

  for (const op of ops) {
    try {
      if (op.type === 'delete') {
        await supabase.from('cats').delete().eq('id', op.cat.id);
      } else {
        let photoPath: string | null = null;
        if (op.cat.photoUri && op.cat.photoUri.startsWith('file://')) {
          photoPath = await uploadPhoto(userId, 'cats', op.cat.id, op.cat.photoUri);
        }
        const dbCat = catToDb(op.cat, userId);
        const insertData = photoPath ? { ...dbCat, photo_path: photoPath } : dbCat;
        await supabase.from('cats').upsert(insertData);
      }
    } catch {
      remaining.push(op);
    }
  }

  if (remaining.length > 0) {
    await AsyncStorage.setItem(PENDING_CAT_OPS_KEY, JSON.stringify(remaining));
  } else {
    await AsyncStorage.removeItem(PENDING_CAT_OPS_KEY);
  }
}
