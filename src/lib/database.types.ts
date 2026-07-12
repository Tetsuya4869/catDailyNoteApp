// Firestore に保存するドキュメントの型。
// アプリ内の型（src/types/index.ts）+ userId のフラット構造で、
// フィールド名は camelCase のまま保存する。
// Firestore は undefined を許容しないため、書き込み時に
// syncService.stripUndefined で未定義フィールドを除去する。

import { CatColor, CatGender, CatMood, HealthType, PostCategory } from '../types';

export type DbCat = {
  id: string;
  userId: string;
  name: string;
  color: CatColor;
  gender?: CatGender;
  birthDate?: string;
  weightGoal?: number;
  photoUri?: string; // Firebase Storage のダウンロード URL
  createdAt: string;
};

export type DbDiaryEntry = {
  id: string;
  userId: string;
  catId?: string;
  date: string;
  title: string;
  content: string;
  mood: CatMood;
  photoUri?: string;
  category?: PostCategory;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DbHealthRecord = {
  id: string;
  userId: string;
  catId: string;
  type: HealthType;
  date: string;
  weightKg?: number;
  title?: string;
  note?: string;
  createdAt: string;
};

export type DbAppointment = {
  id: string;
  userId: string;
  catId: string;
  type: 'vet' | 'vaccine';
  date: string;
  title: string;
  note?: string;
  done: boolean;
};

// Firestore のコレクション名
export const COLLECTIONS = {
  cats: 'cats',
  diaryEntries: 'diaryEntries',
  healthRecords: 'healthRecords',
  appointments: 'appointments',
} as const;
