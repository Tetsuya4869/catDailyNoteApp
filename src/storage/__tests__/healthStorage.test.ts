import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getHealthRecords,
  getHealthRecordsByCat,
  saveHealthRecord,
  deleteHealthRecord,
  getWeightSeries,
  getAppointments,
  getUpcomingAppointments,
  saveAppointment,
  deleteAppointment,
} from '../healthStorage';
import { HealthRecord, Appointment } from '../../types';

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
  healthToDb: jest.fn(),
  dbToHealth: jest.fn(),
  appointmentToDb: jest.fn(),
  dbToAppointment: jest.fn(),
}));

const TEST_USER_ID = 'test-user-123';

function makeRecord(overrides: Partial<HealthRecord> = {}): HealthRecord {
  const now = new Date().toISOString();
  return {
    id: '1',
    catId: 'cat1',
    type: 'weight',
    date: now,
    weightKg: 4.0,
    createdAt: now,
    ...overrides,
  };
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: '1',
    catId: 'cat1',
    type: 'vet',
    date: new Date().toISOString(),
    title: '定期健診',
    done: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('healthStorage - records', () => {
  it('returns empty array when nothing saved', async () => {
    expect(await getHealthRecords(TEST_USER_ID)).toEqual([]);
  });

  it('saves and reads back a record', async () => {
    await saveHealthRecord(makeRecord({ id: 'a' }), TEST_USER_ID);
    const records = await getHealthRecords(TEST_USER_ID);
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('a');
  });

  it('updates an existing record in place', async () => {
    await saveHealthRecord(makeRecord({ id: 'a', weightKg: 4.0 }), TEST_USER_ID);
    await saveHealthRecord(makeRecord({ id: 'a', weightKg: 4.5 }), TEST_USER_ID);
    const records = await getHealthRecords(TEST_USER_ID);
    expect(records).toHaveLength(1);
    expect(records[0].weightKg).toBe(4.5);
  });

  it('deletes a record by id', async () => {
    await saveHealthRecord(makeRecord({ id: 'a' }), TEST_USER_ID);
    await saveHealthRecord(makeRecord({ id: 'b' }), TEST_USER_ID);
    await deleteHealthRecord('a', TEST_USER_ID);
    const records = await getHealthRecords(TEST_USER_ID);
    expect(records.map((r) => r.id)).toEqual(['b']);
  });

  it('filters records by cat, newest first', async () => {
    await saveHealthRecord(
      makeRecord({ id: 'a', catId: 'cat1', date: '2026-01-01T00:00:00.000Z' }),
      TEST_USER_ID
    );
    await saveHealthRecord(
      makeRecord({ id: 'b', catId: 'cat1', date: '2026-02-01T00:00:00.000Z' }),
      TEST_USER_ID
    );
    await saveHealthRecord(makeRecord({ id: 'c', catId: 'cat2' }), TEST_USER_ID);
    const records = await getHealthRecordsByCat('cat1', TEST_USER_ID);
    expect(records.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('returns weight series oldest first, ignoring other types', async () => {
    await saveHealthRecord(
      makeRecord({
        id: 'a',
        type: 'weight',
        weightKg: 4.2,
        date: '2026-02-01T00:00:00.000Z',
      }),
      TEST_USER_ID
    );
    await saveHealthRecord(
      makeRecord({
        id: 'b',
        type: 'weight',
        weightKg: 4.0,
        date: '2026-01-01T00:00:00.000Z',
      }),
      TEST_USER_ID
    );
    await saveHealthRecord(
      makeRecord({ id: 'c', type: 'vaccine', weightKg: undefined }),
      TEST_USER_ID
    );
    const series = await getWeightSeries('cat1', TEST_USER_ID);
    expect(series).toEqual([
      { date: '2026-01-01T00:00:00.000Z', weightKg: 4.0 },
      { date: '2026-02-01T00:00:00.000Z', weightKg: 4.2 },
    ]);
  });

  it('falls back to empty array on corrupted JSON', async () => {
    await AsyncStorage.setItem('@cat_diary_health', 'not-json');
    expect(await getHealthRecords(TEST_USER_ID)).toEqual([]);
  });
});

describe('healthStorage - appointments', () => {
  it('saves and reads back an appointment', async () => {
    await saveAppointment(makeAppointment({ id: 'a' }), TEST_USER_ID);
    const appointments = await getAppointments(TEST_USER_ID);
    expect(appointments).toHaveLength(1);
  });

  it('returns only upcoming, undone appointments sorted by date', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const soon = new Date(Date.now() + 86400000).toISOString();
    const later = new Date(Date.now() + 2 * 86400000).toISOString();
    await saveAppointment(makeAppointment({ id: 'past', date: past }), TEST_USER_ID);
    await saveAppointment(makeAppointment({ id: 'later', date: later }), TEST_USER_ID);
    await saveAppointment(makeAppointment({ id: 'soon', date: soon }), TEST_USER_ID);
    await saveAppointment(
      makeAppointment({ id: 'done', date: soon, done: true }),
      TEST_USER_ID
    );
    const upcoming = await getUpcomingAppointments(TEST_USER_ID);
    expect(upcoming.map((a) => a.id)).toEqual(['soon', 'later']);
  });

  it('deletes an appointment by id', async () => {
    await saveAppointment(makeAppointment({ id: 'a' }), TEST_USER_ID);
    await saveAppointment(makeAppointment({ id: 'b' }), TEST_USER_ID);
    await deleteAppointment('a', TEST_USER_ID);
    const appointments = await getAppointments(TEST_USER_ID);
    expect(appointments.map((a) => a.id)).toEqual(['b']);
  });
});
