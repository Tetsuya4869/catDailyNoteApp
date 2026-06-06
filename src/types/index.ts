export interface Cat {
  id: string;
  name: string;
  color: CatColor;
  birthDate?: string;
  photoUri?: string;
  createdAt: string;
}

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

export interface DiaryEntry {
  id: string;
  catId?: string;
  date: string;
  title: string;
  content: string;
  mood: CatMood;
  photoUri?: string;
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
