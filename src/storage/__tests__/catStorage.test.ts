import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCats, saveCat, deleteCat, getCatById } from '../catStorage';
import { Cat } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock('../../lib/syncService', () => ({
  isOnline: jest.fn().mockResolvedValue(false),
  catToDb: jest.fn(),
  dbToCat: jest.fn(),
}));

jest.mock('../../lib/photoStorage', () => ({
  uploadPhoto: jest.fn(),
}));

const TEST_USER_ID = 'test-user-123';

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
    const cats = await getCats(TEST_USER_ID);
    expect(cats).toEqual([]);
  });

  it('saves a new cat and reads it back', async () => {
    const cat = makeCat({ id: 'a', name: 'タマ' });
    await saveCat(cat, TEST_USER_ID);

    const cats = await getCats(TEST_USER_ID);
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('タマ');
  });

  it('updates an existing cat in place', async () => {
    await saveCat(makeCat({ id: 'a', name: '元の名前' }), TEST_USER_ID);
    await saveCat(makeCat({ id: 'a', name: '新しい名前' }), TEST_USER_ID);

    const cats = await getCats(TEST_USER_ID);
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('新しい名前');
  });

  it('deletes a cat by id', async () => {
    await saveCat(makeCat({ id: 'a' }), TEST_USER_ID);
    await saveCat(makeCat({ id: 'b' }), TEST_USER_ID);

    await deleteCat('a', TEST_USER_ID);

    const cats = await getCats(TEST_USER_ID);
    expect(cats.map((c) => c.id)).toEqual(['b']);
  });

  it('finds a cat by id', async () => {
    await saveCat(makeCat({ id: 'a', name: 'クロ' }), TEST_USER_ID);
    const found = await getCatById('a');
    expect(found?.name).toBe('クロ');
  });

  it('returns null when a cat id is not found', async () => {
    const found = await getCatById('missing');
    expect(found).toBeNull();
  });
});
