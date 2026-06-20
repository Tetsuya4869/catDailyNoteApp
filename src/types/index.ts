// ===== 猫 =====
export type CatGender = 'male' | 'female' | 'unknown';

export interface Cat {
  id: string;
  name: string;
  color: CatColor;
  gender?: CatGender;
  birthDate?: string;
  weightGoal?: number;
  photoUri?: string;
  createdAt: string;
}

export const catGenderSymbols: Record<CatGender, string> = {
  male: '♂',
  female: '♀',
  unknown: '・',
};

export type CatColor = 'orange' | 'black' | 'white' | 'gray' | 'calico' | 'tabby';

export const catColorEmojis: Record<CatColor, string> = {
  orange: '🧡',
  black: '🖤',
  white: '🤍',
  gray: '🩶',
  calico: '🧡🖤🤍',
  tabby: '🐯',
};

export const catColorLabels: Record<CatColor, string> = {
  orange: '茶トラ',
  black: '黒猫',
  white: '白猫',
  gray: 'グレー',
  calico: '三毛',
  tabby: 'キジトラ',
};

// ===== 日記（投稿）=====
export interface DiaryEntry {
  id: string;
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
}

export type CatMood = 'happy' | 'sleepy' | 'playful' | 'hungry' | 'relaxed';

export const moodEmojis: Record<CatMood, string> = {
  happy: '😸',
  sleepy: '😴',
  playful: '🐱',
  hungry: '😿',
  relaxed: '😺',
};

export const moodLabels: Record<CatMood, string> = {
  happy: 'ごきげん',
  sleepy: 'ねむい',
  playful: 'あそびたい',
  hungry: 'おなかすいた',
  relaxed: 'リラックス',
};

// ===== 投稿カテゴリ（タグ）=====
export type PostCategory =
  | 'meal'
  | 'play'
  | 'sleep'
  | 'health'
  | 'grooming'
  | 'other';

export const postCategoryEmojis: Record<PostCategory, string> = {
  meal: '🍚',
  play: '🧶',
  sleep: '💤',
  health: '🏥',
  grooming: '🪥',
  other: '🐾',
};

export const postCategoryLabels: Record<PostCategory, string> = {
  meal: 'ごはん',
  play: 'あそび',
  sleep: 'おひるね',
  health: '通院',
  grooming: 'お手入れ',
  other: 'その他',
};

// ===== 健康記録 =====
export type HealthType = 'weight' | 'vet' | 'vaccine' | 'medication';

export interface HealthRecord {
  id: string;
  catId: string;
  type: HealthType;
  date: string;
  weightKg?: number;
  title?: string;
  note?: string;
  createdAt: string;
}

export const healthTypeEmojis: Record<HealthType, string> = {
  weight: '⚖️',
  vet: '🏥',
  vaccine: '💉',
  medication: '💊',
};

export const healthTypeLabels: Record<HealthType, string> = {
  weight: '体重',
  vet: '通院',
  vaccine: 'ワクチン',
  medication: '投薬',
};

// ===== 予定（通院・ワクチンのリマインド）=====
export interface Appointment {
  id: string;
  catId: string;
  type: 'vet' | 'vaccine';
  date: string;
  title: string;
  note?: string;
  done: boolean;
}
