import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCats, saveCat, deleteCat, getCatById } from '../catStorage';
import { Cat } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

function makeCat(overrides: Partial<Cat> = {}): Cat {
  return {
    id: '1',
    name: 'ミケ',
    color: 'calico',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('catStorage', () => {
  it('returns an empty array when no cats exist', async () => {
    const cats = await getCats();
    expect(cats).toEqual([]);
  });

  it('saves a new cat and reads it back', async () => {
    const cat = makeCat({ id: 'a', name: 'タマ' });
    await saveCat(cat);

    const cats = await getCats();
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('タマ');
  });

  it('updates an existing cat in place', async () => {
    await saveCat(makeCat({ id: 'a', name: '元の名前' }));
    await saveCat(makeCat({ id: 'a', name: '新しい名前' }));

    const cats = await getCats();
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('新しい名前');
  });

  it('deletes a cat by id', async () => {
    await saveCat(makeCat({ id: 'a' }));
    await saveCat(makeCat({ id: 'b' }));

    await deleteCat('a');

    const cats = await getCats();
    expect(cats.map((c) => c.id)).toEqual(['b']);
  });

  it('finds a cat by id', async () => {
    await saveCat(makeCat({ id: 'a', name: 'クロ' }));
    const found = await getCatById('a');
    expect(found?.name).toBe('クロ');
  });

  it('returns null when a cat id is not found', async () => {
    const found = await getCatById('missing');
    expect(found).toBeNull();
  });
});
