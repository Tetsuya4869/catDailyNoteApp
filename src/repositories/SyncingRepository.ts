import { AppRepository } from './AppRepository';
import { Appointment, Cat, DiaryEntry, HealthRecord } from '../types';

/**
 * Offline-first adapter. Reads are served from local storage; writes are committed
 * locally first and mirrored to Supabase. `pullRemote()` can be called after login
 * or app resume to merge server-side records into the local cache.
 */
export class SyncingRepository implements AppRepository {
  constructor(private readonly local: AppRepository, private readonly remote: AppRepository) {}

  private async mirror(operation: () => Promise<void>) {
    try {
      await operation();
    } catch (error) {
      console.warn('[sync] remote write deferred', error);
    }
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

  getCats() { return this.local.getCats(); }
  getAllCats() { return this.local.getAllCats(); }
  getCatById(id: string) { return this.local.getCatById(id); }
  async saveCat(cat: Cat) { await this.local.saveCat(cat); await this.mirror(() => this.remote.saveCat(cat)); }
  async archiveCat(id: string) { await this.local.archiveCat(id); await this.mirror(() => this.remote.archiveCat(id)); }

  getDiaryEntries() { return this.local.getDiaryEntries(); }
  getDiaryEntryById(id: string) { return this.local.getDiaryEntryById(id); }
  async saveDiaryEntry(entry: DiaryEntry) { await this.local.saveDiaryEntry(entry); await this.mirror(() => this.remote.saveDiaryEntry(entry)); }
  async deleteDiaryEntry(id: string) { await this.local.deleteDiaryEntry(id); await this.mirror(() => this.remote.deleteDiaryEntry(id)); }

  getHealthRecords() { return this.local.getHealthRecords(); }
  getHealthRecordsByCat(catId: string) { return this.local.getHealthRecordsByCat(catId); }
  getWeightSeries(catId: string) { return this.local.getWeightSeries(catId); }
  async saveHealthRecord(record: HealthRecord) { await this.local.saveHealthRecord(record); await this.mirror(() => this.remote.saveHealthRecord(record)); }
  async deleteHealthRecord(id: string) { await this.local.deleteHealthRecord(id); await this.mirror(() => this.remote.deleteHealthRecord(id)); }

  getAppointments() { return this.local.getAppointments(); }
  getAppointmentsByCat(catId: string) { return this.local.getAppointmentsByCat(catId); }
  async saveAppointment(item: Appointment) { await this.local.saveAppointment(item); await this.mirror(() => this.remote.saveAppointment(item)); }
  async deleteAppointment(id: string) { await this.local.deleteAppointment(id); await this.mirror(() => this.remote.deleteAppointment(id)); }
}
