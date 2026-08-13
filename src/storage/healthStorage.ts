import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthRecord, Appointment } from '../types';
import { normalizeDateOnly, todayDateOnly } from '../utils/date';

export const HEALTH_STORAGE_KEY = '@cat_diary_health';
export const APPOINTMENT_STORAGE_KEY = '@cat_diary_appointments';

function normalizeHealthRecord(record: HealthRecord): HealthRecord {
  return { ...record, date: normalizeDateOnly(record.date) ?? todayDateOnly() };
}

function normalizeAppointment(appointment: Appointment): Appointment {
  return { ...appointment, date: normalizeDateOnly(appointment.date) ?? todayDateOnly() };
}

// ===== 健康記録 =====
export async function getHealthRecords(): Promise<HealthRecord[]> {
  const json = await AsyncStorage.getItem(HEALTH_STORAGE_KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const records = parsed.map((r) => normalizeHealthRecord(r as HealthRecord));
    if (JSON.stringify(records) !== JSON.stringify(parsed)) {
      await saveHealthRecords(records);
    }
    return records;
  } catch {
    return [];
  }
}

export async function saveHealthRecords(records: HealthRecord[]): Promise<void> {
  await AsyncStorage.setItem(
    HEALTH_STORAGE_KEY,
    JSON.stringify(records.map(normalizeHealthRecord))
  );
}

export async function getHealthRecordsByCat(catId: string): Promise<HealthRecord[]> {
  const records = await getHealthRecords();
  return records
    .filter((r) => r.catId === catId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveHealthRecord(record: HealthRecord): Promise<void> {
  const records = await getHealthRecords();
  const normalized = normalizeHealthRecord(record);
  const index = records.findIndex((r) => r.id === normalized.id);
  if (index >= 0) records[index] = normalized;
  else records.push(normalized);
  await saveHealthRecords(records);
}

export async function deleteHealthRecord(id: string): Promise<void> {
  const records = await getHealthRecords();
  await saveHealthRecords(records.filter((r) => r.id !== id));
}

export async function getWeightSeries(catId: string): Promise<{ date: string; weightKg: number }[]> {
  const records = await getHealthRecords();
  return records
    .filter((r) => r.catId === catId && r.type === 'weight' && r.weightKg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, weightKg: r.weightKg as number }));
}

// ===== 予定（通院・ワクチン）=====
export async function getAppointments(): Promise<Appointment[]> {
  const json = await AsyncStorage.getItem(APPOINTMENT_STORAGE_KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    const appointments = parsed.map((a) => normalizeAppointment(a as Appointment));
    if (JSON.stringify(appointments) !== JSON.stringify(parsed)) {
      await saveAppointments(appointments);
    }
    return appointments;
  } catch {
    return [];
  }
}

export async function saveAppointments(appointments: Appointment[]): Promise<void> {
  await AsyncStorage.setItem(
    APPOINTMENT_STORAGE_KEY,
    JSON.stringify(appointments.map(normalizeAppointment))
  );
}

export async function getAppointmentsByCat(catId: string): Promise<Appointment[]> {
  const appointments = await getAppointments();
  return appointments.filter((a) => a.catId === catId).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getUpcomingAppointments(from: Date = new Date()): Promise<Appointment[]> {
  const appointments = await getAppointments();
  const fromDate = todayDateOnly(from);
  return appointments
    .filter((a) => !a.done && a.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveAppointment(appointment: Appointment): Promise<void> {
  const appointments = await getAppointments();
  const normalized = normalizeAppointment(appointment);
  const index = appointments.findIndex((a) => a.id === normalized.id);
  if (index >= 0) appointments[index] = normalized;
  else appointments.push(normalized);
  await saveAppointments(appointments);
}

export async function deleteAppointment(id: string): Promise<void> {
  const appointments = await getAppointments();
  await saveAppointments(appointments.filter((a) => a.id !== id));
}
