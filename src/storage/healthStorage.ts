import AsyncStorage from '@react-native-async-storage/async-storage';
import { HealthRecord, Appointment } from '../types';
import { supabase } from '../lib/supabase';
import { isOnline, healthToDb, dbToHealth, appointmentToDb, dbToAppointment } from '../lib/syncService';
import { DbHealthRecord, DbAppointment } from '../lib/database.types';

const HEALTH_STORAGE_KEY = '@cat_diary_health';
const APPOINTMENT_STORAGE_KEY = '@cat_diary_appointments';
const PENDING_HEALTH_OPS_KEY = '@cat_diary_pending_health_ops';
const PENDING_APPT_OPS_KEY = '@cat_diary_pending_appt_ops';

type HealthPendingOp = {
  type: 'upsert' | 'delete';
  record: HealthRecord;
  timestamp: string;
};

type ApptPendingOp = {
  type: 'upsert' | 'delete';
  appointment: Appointment;
  timestamp: string;
};

// ===== Cache helpers =====
async function getCachedHealthRecords(): Promise<HealthRecord[]> {
  const json = await AsyncStorage.getItem(HEALTH_STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

async function setCachedHealthRecords(records: HealthRecord[]): Promise<void> {
  await AsyncStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(records));
}

async function getCachedAppointments(): Promise<Appointment[]> {
  const json = await AsyncStorage.getItem(APPOINTMENT_STORAGE_KEY);
  if (!json) return [];
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

async function setCachedAppointments(appointments: Appointment[]): Promise<void> {
  await AsyncStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify(appointments));
}

async function addHealthPendingOp(op: HealthPendingOp): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_HEALTH_OPS_KEY);
  const ops: HealthPendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.record.id !== op.record.id);
  filtered.push(op);
  await AsyncStorage.setItem(PENDING_HEALTH_OPS_KEY, JSON.stringify(filtered));
}

async function addApptPendingOp(op: ApptPendingOp): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_APPT_OPS_KEY);
  const ops: ApptPendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.appointment.id !== op.appointment.id);
  filtered.push(op);
  await AsyncStorage.setItem(PENDING_APPT_OPS_KEY, JSON.stringify(filtered));
}

// ===== 健康記録 =====
export async function getHealthRecords(userId: string): Promise<HealthRecord[]> {
  const online = await isOnline();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      const records = (data as DbHealthRecord[] || []).map(dbToHealth);
      await setCachedHealthRecords(records);
      return records;
    } catch (err) {
      console.error('Failed to fetch health records:', err);
    }
  }

  return getCachedHealthRecords();
}

export async function getHealthRecordsByCat(
  catId: string,
  userId: string
): Promise<HealthRecord[]> {
  const records = await getHealthRecords(userId);
  return records
    .filter((r) => r.catId === catId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function saveHealthRecord(record: HealthRecord, userId: string): Promise<void> {
  const records = await getCachedHealthRecords();
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  await setCachedHealthRecords(records);

  const online = await isOnline();

  if (online) {
    try {
      const dbRecord = healthToDb(record, userId);
      const { error } = await supabase.from('health_records').upsert(dbRecord);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save health record:', err);
      await addHealthPendingOp({ type: 'upsert', record, timestamp: new Date().toISOString() });
    }
  } else {
    await addHealthPendingOp({ type: 'upsert', record, timestamp: new Date().toISOString() });
  }
}

export async function deleteHealthRecord(id: string, userId: string): Promise<void> {
  const records = await getCachedHealthRecords();
  const record = records.find((r) => r.id === id);
  const filtered = records.filter((r) => r.id !== id);
  await setCachedHealthRecords(filtered);

  const online = await isOnline();

  if (online) {
    try {
      const { error } = await supabase.from('health_records').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete health record:', err);
      if (record) {
        await addHealthPendingOp({ type: 'delete', record, timestamp: new Date().toISOString() });
      }
    }
  } else if (record) {
    await addHealthPendingOp({ type: 'delete', record, timestamp: new Date().toISOString() });
  }
}

export async function getWeightSeries(
  catId: string,
  userId: string
): Promise<{ date: string; weightKg: number }[]> {
  const records = await getHealthRecords(userId);
  return records
    .filter((r) => r.catId === catId && r.type === 'weight' && r.weightKg != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((r) => ({ date: r.date, weightKg: r.weightKg as number }));
}

// ===== 予定（通院・ワクチン）=====
export async function getAppointments(userId: string): Promise<Appointment[]> {
  const online = await isOnline();

  if (online) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;

      const appointments = (data as DbAppointment[] || []).map(dbToAppointment);
      await setCachedAppointments(appointments);
      return appointments;
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
  }

  return getCachedAppointments();
}

export async function getUpcomingAppointments(
  userId: string,
  from: Date = new Date()
): Promise<Appointment[]> {
  const appointments = await getAppointments(userId);
  const fromTime = from.getTime();
  return appointments
    .filter((a) => !a.done && new Date(a.date).getTime() >= fromTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function saveAppointment(appointment: Appointment, userId: string): Promise<void> {
  const appointments = await getCachedAppointments();
  const index = appointments.findIndex((a) => a.id === appointment.id);
  if (index >= 0) {
    appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }
  await setCachedAppointments(appointments);

  const online = await isOnline();

  if (online) {
    try {
      const dbAppt = appointmentToDb(appointment, userId);
      const { error } = await supabase.from('appointments').upsert(dbAppt);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save appointment:', err);
      await addApptPendingOp({ type: 'upsert', appointment, timestamp: new Date().toISOString() });
    }
  } else {
    await addApptPendingOp({ type: 'upsert', appointment, timestamp: new Date().toISOString() });
  }
}

export async function deleteAppointment(id: string, userId: string): Promise<void> {
  const appointments = await getCachedAppointments();
  const appointment = appointments.find((a) => a.id === id);
  const filtered = appointments.filter((a) => a.id !== id);
  await setCachedAppointments(filtered);

  const online = await isOnline();

  if (online) {
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete appointment:', err);
      if (appointment) {
        await addApptPendingOp({ type: 'delete', appointment, timestamp: new Date().toISOString() });
      }
    }
  } else if (appointment) {
    await addApptPendingOp({ type: 'delete', appointment, timestamp: new Date().toISOString() });
  }
}

export async function syncPendingHealthOps(userId: string): Promise<void> {
  const healthJson = await AsyncStorage.getItem(PENDING_HEALTH_OPS_KEY);
  if (healthJson) {
    const ops: HealthPendingOp[] = JSON.parse(healthJson);
    const remaining: HealthPendingOp[] = [];

    for (const op of ops) {
      try {
        if (op.type === 'delete') {
          await supabase.from('health_records').delete().eq('id', op.record.id);
        } else {
          const dbRecord = healthToDb(op.record, userId);
          await supabase.from('health_records').upsert(dbRecord);
        }
      } catch {
        remaining.push(op);
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(PENDING_HEALTH_OPS_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(PENDING_HEALTH_OPS_KEY);
    }
  }

  const apptJson = await AsyncStorage.getItem(PENDING_APPT_OPS_KEY);
  if (apptJson) {
    const ops: ApptPendingOp[] = JSON.parse(apptJson);
    const remaining: ApptPendingOp[] = [];

    for (const op of ops) {
      try {
        if (op.type === 'delete') {
          await supabase.from('appointments').delete().eq('id', op.appointment.id);
        } else {
          const dbAppt = appointmentToDb(op.appointment, userId);
          await supabase.from('appointments').upsert(dbAppt);
        }
      } catch {
        remaining.push(op);
      }
    }

    if (remaining.length > 0) {
      await AsyncStorage.setItem(PENDING_APPT_OPS_KEY, JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem(PENDING_APPT_OPS_KEY);
    }
  }
}
