import * as FileSystem from 'expo-file-system';
import { AppRepository } from './AppRepository';
import { Appointment, Cat, DiaryEntry, HealthRecord } from '../types';

export type SupabaseSession = { url: string; anonKey: string; accessToken: string; userId: string };
type Row = Record<string, unknown>;

export class SupabaseRepository implements AppRepository {
  constructor(private readonly session: SupabaseSession) {}

  private baseUrl() { return this.session.url.replace(/\/$/, ''); }
  private async request<T>(table: string, init: RequestInit = {}, query = ''): Promise<T> {
    const response = await fetch(`${this.baseUrl()}/rest/v1/${table}${query}`, { ...init, headers: { apikey: this.session.anonKey, Authorization: `Bearer ${this.session.accessToken}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates', ...(init.headers || {}) } });
    if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
    if (response.status === 204) return undefined as T;
    const text = await response.text(); return (text ? JSON.parse(text) : undefined) as T;
  }
  private userFilter(extra = '') { return `?user_id=eq.${encodeURIComponent(this.session.userId)}${extra}`; }

  private async uploadMedia(uri?: string): Promise<string | undefined> {
    if (!uri || /^https?:\/\//.test(uri)) return uri;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return undefined;
    const ext = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const objectPath = `${this.session.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const result = await FileSystem.uploadAsync(`${this.baseUrl()}/storage/v1/object/cat-media/${objectPath}`, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { apikey: this.session.anonKey, Authorization: `Bearer ${this.session.accessToken}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    });
    if (result.status < 200 || result.status >= 300) throw new Error(`Supabase Storage ${result.status}: ${result.body}`);
    return `${this.baseUrl()}/storage/v1/object/public/cat-media/${objectPath}`;
  }

  private catFromRow(row: Row): Cat { return { id: String(row.id), name: String(row.name), color: row.color as Cat['color'], gender: (row.gender ?? undefined) as Cat['gender'], birthDate: (row.birth_date ?? undefined) as string | undefined, weightGoal: row.weight_goal == null ? undefined : Number(row.weight_goal), photoUri: (row.photo_uri ?? undefined) as string | undefined, createdAt: String(row.created_at), archivedAt: (row.archived_at ?? undefined) as string | undefined }; }
  private catToRow(cat: Cat) { return { id: cat.id, user_id: this.session.userId, name: cat.name, color: cat.color, gender: cat.gender ?? null, birth_date: cat.birthDate ?? null, weight_goal: cat.weightGoal ?? null, photo_uri: cat.photoUri ?? null, created_at: cat.createdAt, archived_at: cat.archivedAt ?? null }; }
  private diaryFromRow(row: Row): DiaryEntry { return { id: String(row.id), catId: (row.cat_id ?? undefined) as string | undefined, date: String(row.date), title: String(row.title), content: String(row.content ?? ''), mood: row.mood as DiaryEntry['mood'], photoUri: (row.photo_uri ?? undefined) as string | undefined, category: (row.category ?? undefined) as DiaryEntry['category'], favorite: Boolean(row.favorite), createdAt: String(row.created_at), updatedAt: String(row.updated_at) }; }
  private diaryToRow(entry: DiaryEntry) { return { id: entry.id, user_id: this.session.userId, cat_id: entry.catId ?? null, date: entry.date, title: entry.title, content: entry.content, mood: entry.mood, photo_uri: entry.photoUri ?? null, category: entry.category ?? null, favorite: entry.favorite ?? false, created_at: entry.createdAt, updated_at: entry.updatedAt }; }
  private healthFromRow(row: Row): HealthRecord { return { id: String(row.id), catId: String(row.cat_id), type: row.type as HealthRecord['type'], date: String(row.date), weightKg: row.weight_kg == null ? undefined : Number(row.weight_kg), title: (row.title ?? undefined) as string | undefined, note: (row.note ?? undefined) as string | undefined, createdAt: String(row.created_at) }; }
  private healthToRow(record: HealthRecord) { return { id: record.id, user_id: this.session.userId, cat_id: record.catId, type: record.type, date: record.date, weight_kg: record.weightKg ?? null, title: record.title ?? null, note: record.note ?? null, created_at: record.createdAt }; }
  private appointmentFromRow(row: Row): Appointment { return { id: String(row.id), catId: String(row.cat_id), type: row.type as Appointment['type'], date: String(row.date), title: String(row.title), note: (row.note ?? undefined) as string | undefined, done: Boolean(row.done) }; }
  private appointmentToRow(item: Appointment) { return { id: item.id, user_id: this.session.userId, cat_id: item.catId, type: item.type, date: item.date, title: item.title, note: item.note ?? null, done: item.done }; }

  async getAllCats() { return (await this.request<Row[]>('cats', {}, this.userFilter('&order=created_at.asc'))).map((r) => this.catFromRow(r)); }
  async getCats() { return (await this.getAllCats()).filter((cat) => !cat.archivedAt); }
  async getCatById(id: string) { const rows = await this.request<Row[]>('cats', {}, this.userFilter(`&id=eq.${encodeURIComponent(id)}&limit=1`)); return rows[0] ? this.catFromRow(rows[0]) : null; }
  async saveCat(cat: Cat) { const photoUri = await this.uploadMedia(cat.photoUri); await this.request('cats', { method: 'POST', body: JSON.stringify(this.catToRow({ ...cat, photoUri })) }, '?on_conflict=id'); }
  async archiveCat(id: string) { await this.request('cats', { method: 'PATCH', body: JSON.stringify({ archived_at: new Date().toISOString() }) }, this.userFilter(`&id=eq.${encodeURIComponent(id)}`)); }

  async getDiaryEntries() { return (await this.request<Row[]>('diary_entries', {}, this.userFilter('&order=date.desc,created_at.desc'))).map((r) => this.diaryFromRow(r)); }
  async getDiaryEntryById(id: string) { const rows = await this.request<Row[]>('diary_entries', {}, this.userFilter(`&id=eq.${encodeURIComponent(id)}&limit=1`)); return rows[0] ? this.diaryFromRow(rows[0]) : null; }
  async saveDiaryEntry(entry: DiaryEntry) { const photoUri = await this.uploadMedia(entry.photoUri); await this.request('diary_entries', { method: 'POST', body: JSON.stringify(this.diaryToRow({ ...entry, photoUri })) }, '?on_conflict=id'); }
  async deleteDiaryEntry(id: string) { await this.request('diary_entries', { method: 'DELETE' }, this.userFilter(`&id=eq.${encodeURIComponent(id)}`)); }

  async getHealthRecords() { return (await this.request<Row[]>('health_records', {}, this.userFilter('&order=date.desc'))).map((r) => this.healthFromRow(r)); }
  async getHealthRecordsByCat(catId: string) { return (await this.getHealthRecords()).filter((r) => r.catId === catId); }
  async getWeightSeries(catId: string) { return (await this.getHealthRecordsByCat(catId)).filter((r) => r.type === 'weight' && r.weightKg != null).sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ date: r.date, weightKg: r.weightKg as number })); }
  async saveHealthRecord(record: HealthRecord) { await this.request('health_records', { method: 'POST', body: JSON.stringify(this.healthToRow(record)) }, '?on_conflict=id'); }
  async deleteHealthRecord(id: string) { await this.request('health_records', { method: 'DELETE' }, this.userFilter(`&id=eq.${encodeURIComponent(id)}`)); }

  async getAppointments() { return (await this.request<Row[]>('appointments', {}, this.userFilter('&order=date.asc'))).map((r) => this.appointmentFromRow(r)); }
  async getAppointmentsByCat(catId: string) { return (await this.getAppointments()).filter((a) => a.catId === catId); }
  async saveAppointment(item: Appointment) { await this.request('appointments', { method: 'POST', body: JSON.stringify(this.appointmentToRow(item)) }, '?on_conflict=id'); }
  async deleteAppointment(id: string) { await this.request('appointments', { method: 'DELETE' }, this.userFilter(`&id=eq.${encodeURIComponent(id)}`)); }
}
