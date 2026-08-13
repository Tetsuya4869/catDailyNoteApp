import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppRepository } from '../AppRepository';
import { SyncingRepository } from '../SyncingRepository';
import { DiaryEntry } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

function diary(id: string): DiaryEntry {
  return {
    id,
    date: '2026-08-13',
    title: id,
    content: '',
    mood: 'happy',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
  };
}

function baseRepository(overrides: Partial<AppRepository> = {}): AppRepository {
  return {
    getCats: async () => [],
    getAllCats: async () => [],
    getCatById: async () => null,
    saveCat: async () => {},
    archiveCat: async () => {},
    getDiaryEntries: async () => [],
    getDiaryEntryById: async () => null,
    saveDiaryEntry: async () => {},
    deleteDiaryEntry: async () => {},
    getHealthRecords: async () => [],
    getHealthRecordsByCat: async () => [],
    getWeightSeries: async () => [],
    saveHealthRecord: async () => {},
    deleteHealthRecord: async () => {},
    getAppointments: async () => [],
    getAppointmentsByCat: async () => [],
    saveAppointment: async () => {},
    deleteAppointment: async () => {},
    ...overrides,
  };
}

describe('SyncingRepository delete tombstones', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('does not resurrect a local delete while the remote delete is offline', async () => {
    let localEntries = [diary('a')];
    let remoteEntries = [diary('a')];
    let remoteOnline = false;

    const local = baseRepository({
      getDiaryEntries: async () => localEntries,
      getDiaryEntryById: async (id) => localEntries.find((entry) => entry.id === id) ?? null,
      saveDiaryEntry: async (entry) => {
        localEntries = [...localEntries.filter((item) => item.id !== entry.id), entry];
      },
      deleteDiaryEntry: async (id) => {
        localEntries = localEntries.filter((entry) => entry.id !== id);
      },
    });

    const remote = baseRepository({
      getDiaryEntries: async () => remoteEntries,
      deleteDiaryEntry: async (id) => {
        if (!remoteOnline) throw new Error('offline');
        remoteEntries = remoteEntries.filter((entry) => entry.id !== id);
      },
    });

    const syncing = new SyncingRepository(local, remote);
    await syncing.deleteDiaryEntry('a');
    expect(localEntries).toEqual([]);
    expect(remoteEntries).toHaveLength(1);

    await syncing.syncNow();
    expect(localEntries).toEqual([]);
    expect(remoteEntries).toHaveLength(1);

    remoteOnline = true;
    await syncing.syncNow();
    expect(localEntries).toEqual([]);
    expect(remoteEntries).toEqual([]);
  });
});
