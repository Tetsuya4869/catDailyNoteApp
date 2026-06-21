import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthRecord, Appointment } from '../types';

const HEALTH_STORAGE_KEY = '@cat_diary_health';
const APPOINTMENT_STORAGE_KEY = '@cat_diary_appointments';

// ===== 健康記録 =====
export async function getHealthRecords(): Promise<HealthRecord[]> {
  const json = await AsyncStorage.getItem(HEALTH_STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function getHealthRecordsByCat(
  catId: string
): Promise<HealthRecord[]> {
  const records = await getHealthRecords();
  return records
    .filter((r) => r.catId === catId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveHealthRecord(record: HealthRecord): Promise<void> {
  const records = await getHealthRecords();
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  await AsyncStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(records));
}

export async function deleteHealthRecord(id: string): Promise<void> {
  const records = await getHealthRecords();
  const filtered = records.filter((r) => r.id !== id);
  await AsyncStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * 体重記録を日付の古い順に並べて返す（グラフ描画用）。
 */
export async function getWeightSeries(
  catId: string
): Promise<{ date: string; weightKg: number }[]> {
  const records = await getHealthRecords();
  return records
    .filter(
      (r) => r.catId === catId && r.type === 'weight' && r.weightKg != null
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({ date: r.date, weightKg: r.weightKg as number }));
}

// ===== 予定（通院・ワクチン）=====
export async function getAppointments(): Promise<Appointment[]> {
  const json = await AsyncStorage.getItem(APPOINTMENT_STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export async function getUpcomingAppointments(
  from: Date = new Date()
): Promise<Appointment[]> {
  const appointments = await getAppointments();
  const fromTime = from.getTime();
  return appointments
    .filter((a) => !a.done && new Date(a.date).getTime() >= fromTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function saveAppointment(appointment: Appointment): Promise<void> {
  const appointments = await getAppointments();
  const index = appointments.findIndex((a) => a.id === appointment.id);
  if (index >= 0) {
    appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }
  await AsyncStorage.setItem(
    APPOINTMENT_STORAGE_KEY,
    JSON.stringify(appointments)
  );
}

export async function deleteAppointment(id: string): Promise<void> {
  const appointments = await getAppointments();
  const filtered = appointments.filter((a) => a.id !== id);
  await AsyncStorage.setItem(
    APPOINTMENT_STORAGE_KEY,
    JSON.stringify(filtered)
  );
}
