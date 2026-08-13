import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cat } from '../types';
import { normalizeDateOnly } from '../utils/date';

export const CAT_STORAGE_KEY = '@cat_diary_cats';

function normalizeCat(cat: Cat): Cat {
  return { ...cat, birthDate: normalizeDateOnly(cat.birthDate) };
}

export async function getAllCats(): Promise<Cat[]> {
  const json = await AsyncStorage.getItem(CAT_STORAGE_KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const cats = parsed.map((cat) => normalizeCat(cat as Cat));
    if (JSON.stringify(cats) !== JSON.stringify(parsed)) {
      await saveCats(cats);
    }
    return cats;
  } catch {
    return [];
  }
}

export async function getCats(): Promise<Cat[]> {
  const cats = await getAllCats();
  return cats.filter((cat) => !cat.archivedAt);
}

export async function saveCats(cats: Cat[]): Promise<void> {
  await AsyncStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(cats.map(normalizeCat)));
}

export async function saveCat(cat: Cat): Promise<void> {
  const cats = await getAllCats();
  const normalized = normalizeCat(cat);
  const existingIndex = cats.findIndex((c) => c.id === normalized.id);

  if (existingIndex >= 0) cats[existingIndex] = normalized;
  else cats.push(normalized);

  await saveCats(cats);
}

export async function archiveCat(id: string): Promise<void> {
  const cats = await getAllCats();
  const index = cats.findIndex((cat) => cat.id === id);
  if (index < 0) return;
  cats[index] = { ...cats[index], archivedAt: new Date().toISOString() };
  await saveCats(cats);
}

export async function restoreCat(id: string): Promise<void> {
  const cats = await getAllCats();
  const index = cats.findIndex((cat) => cat.id === id);
  if (index < 0) return;
  const { archivedAt: _archivedAt, ...activeCat } = cats[index];
  cats[index] = activeCat;
  await saveCats(cats);
}

// 後方互換: 削除操作はデータ損失を避けるためアーカイブとして扱う。
export async function deleteCat(id: string): Promise<void> {
  await archiveCat(id);
}

export async function getCatById(id: string): Promise<Cat | null> {
  const cats = await getAllCats();
  return cats.find((c) => c.id === id) || null;
}
