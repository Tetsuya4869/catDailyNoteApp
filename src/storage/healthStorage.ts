import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { HealthRecord, Appointment } from '../types';
import { db } from '../lib/firebase';
import {
  isOnline,
  healthToDb,
  dbToHealth,
  appointmentToDb,
  dbToAppointment,
} from '../lib/syncService';
import { COLLECTIONS } from '../lib/database.types';

const HEALTH_STORAGE_KEY = '@cat_diary_health';
const APPOINTMENT_STORAGE_KEY = '@cat_diary_appointments';
const PENDING_HEALTH_OPS_KEY = '@cat_diary_pending_health_ops';
const PENDING_APPT_OPS_KEY = '@cat_diary_pending_appt_ops';

let healthSyncInProgress = false;

function generateOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

type HealthPendingOp = {
  id: string;
  type: 'upsert' | 'delete';
  record: HealthRecord;
  timestamp: string;
};

type ApptPendingOp = {
  id: string;
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

async function addHealthPendingOp(op: Omit<HealthPendingOp, 'id'>): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_HEALTH_OPS_KEY);
  const ops: HealthPendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.record.id !== op.record.id);
  filtered.push({ ...op, id: generateOpId() });
  await AsyncStorage.setItem(PENDING_HEALTH_OPS_KEY, JSON.stringify(filtered));
}

async function removeHealthPendingOpById(opId: string): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_HEALTH_OPS_KEY);
  if (!json) return;
  const ops: HealthPendingOp[] = JSON.parse(json);
  const filtered = ops.filter((o) => o.id !== opId);
  await AsyncStorage.setItem(PENDING_HEALTH_OPS_KEY, JSON.stringify(filtered));
}

async function addApptPendingOp(op: Omit<ApptPendingOp, 'id'>): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_APPT_OPS_KEY);
  const ops: ApptPendingOp[] = json ? JSON.parse(json) : [];
  const filtered = ops.filter((o) => o.appointment.id !== op.appointment.id);
  filtered.push({ ...op, id: generateOpId() });
  await AsyncStorage.setItem(PENDING_APPT_OPS_KEY, JSON.stringify(filtered));
}

async function removeApptPendingOpById(opId: string): Promise<void> {
  const json = await AsyncStorage.getItem(PENDING_APPT_OPS_KEY);
  if (!json) return;
  const ops: ApptPendingOp[] = JSON.parse(json);
  const filtered = ops.filter((o) => o.id !== opId);
  await AsyncStorage.setItem(PENDING_APPT_OPS_KEY, JSON.stringify(filtered));
}

// ===== 健康記録 =====
export async function getHealthRecords(userId: string): Promise<HealthRecord[]> {
  const online = await isOnline();

  if (online) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.healthRecords),
          where('userId', '==', userId)
        )
      );
      const records = snapshot.docs
        .map((d) => dbToHealth(d.data()))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
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
      await setDoc(
        doc(db, COLLECTIONS.healthRecords, record.id),
        healthToDb(record, userId)
      );
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
      await deleteDoc(doc(db, COLLECTIONS.healthRecords, id));
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
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.appointments),
          where('userId', '==', userId)
        )
      );
      const appointments = snapshot.docs
        .map((d) => dbToAppointment(d.data()))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
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
      await setDoc(
        doc(db, COLLECTIONS.appointments, appointment.id),
        appointmentToDb(appointment, userId)
      );
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
      await deleteDoc(doc(db, COLLECTIONS.appointments, id));
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
  if (healthSyncInProgress) return;
  healthSyncInProgress = true;

  try {
    // 健康記録の pending ops
    const healthJson = await AsyncStorage.getItem(PENDING_HEALTH_OPS_KEY);
    if (healthJson) {
      const ops: HealthPendingOp[] = JSON.parse(healthJson);
      for (const op of ops) {
        try {
          if (op.type === 'delete') {
            await deleteDoc(doc(db, COLLECTIONS.healthRecords, op.record.id));
          } else {
            await setDoc(
              doc(db, COLLECTIONS.healthRecords, op.record.id),
              healthToDb(op.record, userId)
            );
          }
          await removeHealthPendingOpById(op.id);
        } catch (err) {
          console.error('Sync failed for health op:', op.id, err);
        }
      }
    }

    // 予定の pending ops
    const apptJson = await AsyncStorage.getItem(PENDING_APPT_OPS_KEY);
    if (apptJson) {
      const ops: ApptPendingOp[] = JSON.parse(apptJson);
      for (const op of ops) {
        try {
          if (op.type === 'delete') {
            await deleteDoc(doc(db, COLLECTIONS.appointments, op.appointment.id));
          } else {
            await setDoc(
              doc(db, COLLECTIONS.appointments, op.appointment.id),
              appointmentToDb(op.appointment, userId)
            );
          }
          await removeApptPendingOpById(op.id);
        } catch (err) {
          console.error('Sync failed for appointment op:', op.id, err);
        }
      }
    }
  } finally {
    healthSyncInProgress = false;
  }
}
