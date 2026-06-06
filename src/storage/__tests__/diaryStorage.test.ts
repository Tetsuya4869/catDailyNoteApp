import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDiaryEntries,
  saveDiaryEntry,
  deleteDiaryEntry,
  getDiaryEntryById,
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
    const entries = await getDiaryEntries();
    expect(entries).toEqual([]);
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

  it('refreshes updatedAt when updating an entry', async () => {
    const original = makeEntry({
      id: 'a',
      updatedAt: '2020-01-01T00:00:00.000Z',
    });
    await saveDiaryEntry(original);
    await saveDiaryEntry({ ...original, title: '変更' });

    const [entry] = await getDiaryEntries();
    expect(entry.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
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
    const found = await getDiaryEntryById('missing');
    expect(found).toBeNull();
  });
});
