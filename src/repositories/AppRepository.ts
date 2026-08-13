import { Appointment, Cat, DiaryEntry, HealthRecord } from '../types';

export interface AppRepository {
  getCats(): Promise<Cat[]>;
  getAllCats(): Promise<Cat[]>;
  getCatById(id: string): Promise<Cat | null>;
  saveCat(cat: Cat): Promise<void>;
  archiveCat(id: string): Promise<void>;

  getDiaryEntries(): Promise<DiaryEntry[]>;
  getDiaryEntryById(id: string): Promise<DiaryEntry | null>;
  saveDiaryEntry(entry: DiaryEntry): Promise<void>;
  deleteDiaryEntry(id: string): Promise<void>;

  getHealthRecords(): Promise<HealthRecord[]>;
  getHealthRecordsByCat(catId: string): Promise<HealthRecord[]>;
  getWeightSeries(catId: string): Promise<{ date: string; weightKg: number }[]>;
  saveHealthRecord(record: HealthRecord): Promise<void>;
  deleteHealthRecord(id: string): Promise<void>;

  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByCat(catId: string): Promise<Appointment[]>;
  saveAppointment(appointment: Appointment): Promise<void>;
  deleteAppointment(id: string): Promise<void>;
}
