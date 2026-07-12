import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { Cat } from '../types';
import { db } from '../lib/firebase';
import { isOnline, catToDb, dbToCat } from '../lib/syncService';
import { uploadPhoto } from '../lib/photoStorage';
import { COLLECTIONS } from '../lib/database.types';

const CAT_STORAGE_KEY = '@cat_diary_cats';
const PENDING_CAT_OPS_KEY = '@cat_diary_pending_cat_ops';

let catSyncInProgress = false;

type PendingOp = {
  id: string;
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

function generateOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function addPendingOp(op: Omit<PendingOp, 'id'>): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_CAT_OPS_KEY);
  const ops: PendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.cat.id !== op.cat.id);
  filtered.push({ ...op, id: generateOpId() });
  await AsyncStorage.setItem(PENDING_CAT_OPS_KEY, JSON.stringify(filtered));
}

async function removePendingOpById(opId: string): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_CAT_OPS_KEY);
  if (!json) return;
  const ops: PendingOp[] = JSON.parse(json);
  const filtered = ops.filter((o) => o.id !== opId);
  await AsyncStorage.setItem(PENDING_CAT_OPS_KEY, JSON.stringify(filtered));
}

// ローカル写真があれば Storage にアップロードし、URL を差し替えた Cat を返す
async function withUploadedPhoto(cat: Cat, userId: string): Promise<Cat> {
  if (cat.photoUri && cat.photoUri.startsWith('file://')) {
    const url = await uploadPhoto(userId, 'cats', cat.id, cat.photoUri);
    if (url) return { ...cat, photoUri: url };
  }
  return cat;
}

export async function getCats(userId: string): Promise<Cat[]> {
  const online = await isOnline();

  if (online) {
    try {
      const snapshot = await getDocs(
        query(collection(db, COLLECTIONS.cats), where('userId', '==', userId))
      );
      const cats = snapshot.docs
        .map((d) => dbToCat(d.data()))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      await setCachedCats(cats);
      return cats;
    } catch (err) {
      console.error('Failed to fetch cats from Firestore:', err);
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
      const toSave = await withUploadedPhoto(cat, userId);
      await setDoc(doc(db, COLLECTIONS.cats, cat.id), catToDb(toSave, userId));
    } catch (err) {
      console.error('Failed to save cat to Firestore:', err);
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
      await deleteDoc(doc(db, COLLECTIONS.cats, id));
    } catch (err) {
      console.error('Failed to delete cat from Firestore:', err);
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
  if (catSyncInProgress) return;
  catSyncInProgress = true;

  try {
    const json = await AsyncStorage.getItem(PENDING_CAT_OPS_KEY);
    if (!json) return;

    const ops: PendingOp[] = JSON.parse(json);

    for (const op of ops) {
      try {
        if (op.type === 'delete') {
          await deleteDoc(doc(db, COLLECTIONS.cats, op.cat.id));
        } else {
          const toSave = await withUploadedPhoto(op.cat, userId);
          await setDoc(
            doc(db, COLLECTIONS.cats, op.cat.id),
            catToDb(toSave, userId)
          );
        }
        await removePendingOpById(op.id);
      } catch (err) {
        console.error('Sync failed for cat op:', op.id, err);
      }
    }
  } finally {
    catSyncInProgress = false;
  }
}
