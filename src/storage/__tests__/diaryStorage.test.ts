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
    expect(await getDiaryEntries()).toEqual([]);
  });

  it('saves a new entry and reads it back', async () => {
    const entry = makeEntry({ id: 'a', title: '初日記' });
    await saveDiaryEntry(entry);
    const entries = await getDiaryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('初日記');
  });

  it('prepends newly created entries', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a', title: '1番目' }));
    await saveDiaryEntry(makeEntry({ id: 'b', title: '2番目' }));
    const entries = await getDiaryEntries();
    expect(entries.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('updates an existing entry in place instead of duplicating', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a', title: '元のタイトル' }));
    await saveDiaryEntry(makeEntry({ id: 'a', title: '更新後タイトル' }));
    const entries = await getDiaryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('更新後タイトル');
  });

  it('preserves the supplied updatedAt when updating an entry', async () => {
    const updatedAt = '2020-01-01T00:00:00.000Z';
    const original = makeEntry({ id: 'a', updatedAt });
    await saveDiaryEntry(original);
    await saveDiaryEntry({ ...original, title: '変更' });
    const [entry] = await getDiaryEntries();
    expect(entry.updatedAt).toBe(updatedAt);
  });

  it('deletes an entry by id', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a' }));
    await saveDiaryEntry(makeEntry({ id: 'b' }));
    await deleteDiaryEntry('a');
    const entries = await getDiaryEntries();
    expect(entries.map((e) => e.id)).toEqual(['b']);
  });

  it('finds an entry by id', async () => {
    await saveDiaryEntry(makeEntry({ id: 'a', title: '探し物' }));
    const found = await getDiaryEntryById('a');
    expect(found?.title).toBe('探し物');
  });

  it('returns null when an entry id is not found', async () => {
    expect(await getDiaryEntryById('missing')).toBeNull();
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
    expect(calculateStreak([makeEntry({ id: 'a', date: daysAgo(0) })])).toBe(1);
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
