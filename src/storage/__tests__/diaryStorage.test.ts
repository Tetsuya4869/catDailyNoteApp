import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDiaryEntries,
  saveDiaryEntry,
  deleteDiaryEntry,
  getDiaryEntryById,
  calculateStreak,
} from '../diaryStorage';
import { DiaryEntry } from '../../types';

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
  diaryToDb: jest.fn(),
  dbToDiary: jest.fn(),
}));

jest.mock('../../lib/photoStorage', () => ({
  uploadPhoto: jest.fn(),
}));

const TEST_USER_ID = 'test-user-123';

function makeEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  const now = new Date().toISOString();
  return {
    id: '1',
    date: now,
    title: 'タイトル',
    content: '本文',
    mood: 'happy',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('diaryStorage', () => {
  it('returns an empty array when no entries exist', async () => {
    const entries = await getDiaryEntries(TEST_USER_ID);
    expect(entries).toEqual([]);
  });

  it('saves a new entry and reads it back', async () => {
    const entry = makeEntry({ id: 'a', title: '初日記' });
    await saveDiaryEntry(entry, TEST_USER_ID);

    const entries = await getDiaryEntries(TEST_USER_ID);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('初日記');
  });

  it('prepends newly created entries', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a', title: '1番目' }), TEST_USER_ID);
    await saveDiaryEntry(makeEntry({ id: 'b', title: '2番目' }), TEST_USER_ID);

    const entries = await getDiaryEntries(TEST_USER_ID);
    expect(entries.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('updates an existing entry in place instead of duplicating', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a', title: '元のタイトル' }), TEST_USER_ID);
    await saveDiaryEntry(makeEntry({ id: 'a', title: '更新後タイトル' }), TEST_USER_ID);

    const entries = await getDiaryEntries(TEST_USER_ID);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('更新後タイトル');
  });

  it('refreshes updatedAt when updating an entry', async () => {
    const original = makeEntry({
      id: 'a',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    await saveDiaryEntry(original, TEST_USER_ID);
    await saveDiaryEntry({ ...original, title: '変更' }, TEST_USER_ID);

    const [entry] = await getDiaryEntries(TEST_USER_ID);
    expect(entry.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('deletes an entry by id', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a' }), TEST_USER_ID);
    await saveDiaryEntry(makeEntry({ id: 'b' }), TEST_USER_ID);

    await deleteDiaryEntry('a', TEST_USER_ID);

    const entries = await getDiaryEntries(TEST_USER_ID);
    expect(entries.map((e) => e.id)).toEqual(['b']);
  });

  it('finds an entry by id', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a', title: '探し物' }), TEST_USER_ID);
    const found = await getDiaryEntryById('a');
    expect(found?.title).toBe('探し物');
  });

  it('returns null when an entry id is not found', async () => {
    const found = await getDiaryEntryById('missing');
    expect(found).toBeNull();
  });
});

describe('calculateStreak', () => {
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  it('returns 0 for empty entries', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 1 for only today', () => {
    const e = makeEntry({ id: 'a', date: daysAgo(0) });
    expect(calculateStreak([e])).toBe(1);
  });

  it('counts consecutive days including today', () => {
    const entries = [
      makeEntry({ id: 'a', date: daysAgo(0) }),
      makeEntry({ id: 'b', date: daysAgo(1) }),
      makeEntry({ id: 'c', date: daysAgo(2) }),
    ];
    expect(calculateStreak(entries)).toBe(3);
  });

  it('stops at a gap', () => {
    const entries = [
      makeEntry({ id: 'a', date: daysAgo(0) }),
      makeEntry({ id: 'b', date: daysAgo(1) }),
      makeEntry({ id: 'c', date: daysAgo(3) }),
    ];
    expect(calculateStreak(entries)).toBe(2);
  });

  it('counts from yesterday when today has no entry', () => {
    const entries = [
      makeEntry({ id: 'a', date: daysAgo(1) }),
      makeEntry({ id: 'b', date: daysAgo(2) }),
    ];
    expect(calculateStreak(entries)).toBe(2);
  });

  it('deduplicates multiple entries on the same day', () => {
    const entries = [
      makeEntry({ id: 'a', date: daysAgo(0) }),
      makeEntry({ id: 'b', date: daysAgo(0) }),
      makeEntry({ id: 'c', date: daysAgo(1) }),
    ];
    expect(calculateStreak(entries)).toBe(2);
  });
});
