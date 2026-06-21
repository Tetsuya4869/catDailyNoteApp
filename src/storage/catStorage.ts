import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cat } from '../types';

const CAT_STORAGE_KEY = '@cat_diary_cats';

export async function getCats(): Promise<Cat[]> {
  const json = await AsyncStorage.getItem(CAT_STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveCat(cat: Cat): Promise<void> {
  const cats = await getCats();
  const existingIndex = cats.findIndex((c) => c.id === cat.id);

  if (existingIndex >= 0) {
    cats[existingIndex] = cat;
  } else {
    cats.push(cat);
  }

  await AsyncStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(cats));
}

export async function deleteCat(id: string): Promise<void> {
  const cats = await getCats();
  const filtered = cats.filter((c) => c.id !== id);
  await AsyncStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(filtered));
}

export async function getCatById(id: string): Promise<Cat | null> {
  const cats = await getCats();
  return cats.find((c) => c.id === id) || null;
}
