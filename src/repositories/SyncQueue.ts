import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_DELETE_QUEUE_KEY = '@cat_diary_sync_delete_queue';

export type SyncDeleteEntity = 'diary' | 'health' | 'appointment';
export type SyncDeleteItem = {
  entity: SyncDeleteEntity;
  id: string;
};

export async function getPendingDeletes(): Promise<SyncDeleteItem[]> {
  const json = await AsyncStorage.getItem(SYNC_DELETE_QUEUE_KEY);
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SyncDeleteItem =>
        item &&
        typeof item.id === 'string' &&
        (item.entity === 'diary' || item.entity === 'health' || item.entity === 'appointment')
    );
  } catch {
    return [];
  }
}

async function savePendingDeletes(items: SyncDeleteItem[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_DELETE_QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueDelete(item: SyncDeleteItem): Promise<void> {
  const items = await getPendingDeletes();
  if (!items.some((queued) => queued.entity === item.entity && queued.id === item.id)) {
    items.push(item);
    await savePendingDeletes(items);
  }
}

export async function completeDelete(item: SyncDeleteItem): Promise<void> {
  const items = await getPendingDeletes();
  await savePendingDeletes(
    items.filter((queued) => queued.entity !== item.entity || queued.id !== item.id)
  );
}
