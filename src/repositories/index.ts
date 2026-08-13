import { AppRepository } from './AppRepository';
import { localRepository } from './LocalRepository';
import { SupabaseRepository, SupabaseSession } from './SupabaseRepository';
import { SyncingRepository } from './SyncingRepository';

let activeRepository: AppRepository = localRepository;
let syncingRepository: SyncingRepository | null = null;

const repositoryProxy: AppRepository = {
  getCats: () => activeRepository.getCats(), getAllCats: () => activeRepository.getAllCats(), getCatById: (id) => activeRepository.getCatById(id), saveCat: (cat) => activeRepository.saveCat(cat), archiveCat: (id) => activeRepository.archiveCat(id),
  getDiaryEntries: () => activeRepository.getDiaryEntries(), getDiaryEntryById: (id) => activeRepository.getDiaryEntryById(id), saveDiaryEntry: (entry) => activeRepository.saveDiaryEntry(entry), deleteDiaryEntry: (id) => activeRepository.deleteDiaryEntry(id),
  getHealthRecords: () => activeRepository.getHealthRecords(), getHealthRecordsByCat: (catId) => activeRepository.getHealthRecordsByCat(catId), getWeightSeries: (catId) => activeRepository.getWeightSeries(catId), saveHealthRecord: (record) => activeRepository.saveHealthRecord(record), deleteHealthRecord: (id) => activeRepository.deleteHealthRecord(id),
  getAppointments: () => activeRepository.getAppointments(), getAppointmentsByCat: (catId) => activeRepository.getAppointmentsByCat(catId), saveAppointment: (appointment) => activeRepository.saveAppointment(appointment), deleteAppointment: (id) => activeRepository.deleteAppointment(id),
};

export function getRepository(): AppRepository { return repositoryProxy; }
export function setRepository(repository: AppRepository): void { activeRepository = repository; syncingRepository = repository instanceof SyncingRepository ? repository : null; }
export function configureSupabaseSession(session: SupabaseSession): void { syncingRepository = new SyncingRepository(localRepository, new SupabaseRepository(session)); activeRepository = syncingRepository; }
export async function syncSupabaseNow(): Promise<void> { if (syncingRepository) await syncingRepository.syncNow(); }
export async function pullFromSupabase(): Promise<void> { if (syncingRepository) await syncingRepository.pullRemote(); }
export function useLocalRepository(): void { syncingRepository = null; activeRepository = localRepository; }

export { AppRepository } from './AppRepository';
export { localRepository } from './LocalRepository';
export { SupabaseRepository, SupabaseSession } from './SupabaseRepository';
