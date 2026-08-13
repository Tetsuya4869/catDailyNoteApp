import { AppRepository } from './AppRepository';
import { Appointment, Cat, DiaryEntry, HealthRecord } from '../types';
import {
  SyncDeleteItem,
  completeDelete,
  enqueueDelete,
  getPendingDeletes,
} from './SyncQueue';

/** Offline-first repository: local is authoritative for UI; remote mirrors changes. */
export class SyncingRepository implements AppRepository {
  constructor(private readonly local: AppRepository, private readonly remote: AppRepository) {}

  private async mirror(operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      console.warn('[sync] remote write deferred', error);
    }
  }

  private async executeRemoteDelete(item: SyncDeleteItem): Promise<void> {
    if (item.entity === 'diary') await this.remote.deleteDiaryEntry(item.id);
    else if (item.entity === 'health') await this.remote.deleteHealthRecord(item.id);
    else await this.remote.deleteAppointment(item.id);
  }

  private async flushPendingDeletes(): Promise<boolean> {
    const pending = await getPendingDeletes();
    let allSucceeded = true;
    for (const item of pending) {
      try {
        await this.executeRemoteDelete(item);
        await completeDelete(item);
      } catch (error) {
        allSucceeded = false;
        console.warn('[sync] remote delete deferred', item, error);
      }
    }
    return allSucceeded;
  }

  private async queueDelete(item: SyncDeleteItem, deleteLocal: () => Promise<void>) {
    await deleteLocal();
    await enqueueDelete(item);
    await this.flushPendingDeletes();
  }

  async pullRemote(): Promise<void> {
    const [cats, entries, health, appointments] = await Promise.all([
      this.remote.getAllCats(),
      this.remote.getDiaryEntries(),
      this.remote.getHealthRecords(),
      this.remote.getAppointments(),
    ]);
    for (const cat of cats) await this.local.saveCat(cat);
    for (const entry of entries) await this.local.saveDiaryEntry(entry);
    for (const record of health) await this.local.saveHealthRecord(record);
    for (const appointment of appointments) await this.local.saveAppointment(appointment);
  }

  async pushLocal(): Promise<void> {
    const [cats, entries, health, appointments] = await Promise.all([
      this.local.getAllCats(),
      this.local.getDiaryEntries(),
      this.local.getHealthRecords(),
      this.local.getAppointments(),
    ]);
    for (const cat of cats) await this.remote.saveCat(cat);
    for (const entry of entries) await this.remote.saveDiaryEntry(entry);
    for (const record of health) await this.remote.saveHealthRecord(record);
    for (const appointment of appointments) await this.remote.saveAppointment(appointment);
  }

  async syncNow(): Promise<void> {
    // Never pull while a tombstone could not be delivered: doing so could
    // resurrect a locally deleted record from Supabase.
    if (!(await this.flushPendingDeletes())) return;
    await this.pullRemote();
    await this.pushLocal();
  }

  getCats() { return this.local.getCats(); }
  getAllCats() { return this.local.getAllCats(); }
  getCatById(id: string) { return this.local.getCatById(id); }
  async saveCat(cat: Cat) { await this.local.saveCat(cat); await this.mirror(() => this.remote.saveCat(cat)); }
  async archiveCat(id: string) { await this.local.archiveCat(id); await this.mirror(() => this.remote.archiveCat(id)); }

  getDiaryEntries() { return this.local.getDiaryEntries(); }
  getDiaryEntryById(id: string) { return this.local.getDiaryEntryById(id); }
  async saveDiaryEntry(entry: DiaryEntry) { await this.local.saveDiaryEntry(entry); await this.mirror(() => this.remote.saveDiaryEntry(entry)); }
  async deleteDiaryEntry(id: string) { await this.queueDelete({ entity: 'diary', id }, () => this.local.deleteDiaryEntry(id)); }

  getHealthRecords() { return this.local.getHealthRecords(); }
  getHealthRecordsByCat(catId: string) { return this.local.getHealthRecordsByCat(catId); }
  getWeightSeries(catId: string) { return this.local.getWeightSeries(catId); }
  async saveHealthRecord(record: HealthRecord) { await this.local.saveHealthRecord(record); await this.mirror(() => this.remote.saveHealthRecord(record)); }
  async deleteHealthRecord(id: string) { await this.queueDelete({ entity: 'health', id }, () => this.local.deleteHealthRecord(id)); }

  getAppointments() { return this.local.getAppointments(); }
  getAppointmentsByCat(catId: string) { return this.local.getAppointmentsByCat(catId); }
  async saveAppointment(item: Appointment) { await this.local.saveAppointment(item); await this.mirror(() => this.remote.saveAppointment(item)); }
  async deleteAppointment(id: string) { await this.queueDelete({ entity: 'appointment', id }, () => this.local.deleteAppointment(id)); }
}
