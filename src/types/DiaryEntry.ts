export interface DiaryEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  photoUri: string;   // アプリ内ローカルパス
  caption: string;
  createdAt: string;  // ISO timestamp
}

export type RootStackParamList = {
  Home: undefined;
  NewEntry: undefined;
  EntryDetail: { entry: DiaryEntry };
};
