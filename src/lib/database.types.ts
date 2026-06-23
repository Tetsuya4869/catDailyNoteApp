import { CatColor, CatGender, CatMood, PostCategory, HealthType } from '../types';

export type DbCat = {
  id: string;
  user_id: string;
  name: string;
  color: CatColor;
  gender: CatGender | null;
  birth_date: string | null;
  weight_goal: number | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type DbDiaryEntry = {
  id: string;
  user_id: string;
  cat_id: string | null;
  date: string;
  title: string;
  content: string;
  mood: CatMood;
  photo_path: string | null;
  category: PostCategory | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type DbHealthRecord = {
  id: string;
  user_id: string;
  cat_id: string;
  type: HealthType;
  date: string;
  weight_kg: number | null;
  title: string | null;
  note: string | null;
  created_at: string;
};

export type DbAppointment = {
  id: string;
  user_id: string;
  cat_id: string;
  type: 'vet' | 'vaccine';
  date: string;
  title: string;
  note: string | null;
  done: boolean;
  created_at: string;
};
