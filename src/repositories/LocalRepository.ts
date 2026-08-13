import { AppRepository } from './AppRepository';
import { getCats, getAllCats, getCatById, saveCat, archiveCat } from '../storage/catStorage';
import { getDiaryEntries, getDiaryEntryById, saveDiaryEntry, deleteDiaryEntry } from '../storage/diaryStorage';
import { getHealthRecords, getHealthRecordsByCat, getWeightSeries, saveHealthRecord, deleteHealthRecord, getAppointments, getAppointmentsByCat, saveAppointment, deleteAppointment } from '../storage/healthStorage';

export const localRepository: AppRepository = {
  getCats,
  getAllCats,
  getCatById,
  saveCat,
  archiveCat,
  getDiaryEntries,
  getDiaryEntryById,
  saveDiaryEntry,
  deleteDiaryEntry,
  getHealthRecords,
  getHealthRecordsByCat,
  getWeightSeries,
  saveHealthRecord,
  deleteHealthRecord,
  getAppointments,
  getAppointmentsByCat,
  saveAppointment,
  deleteAppointment,
};
