export interface DiaryEntry {
  id: string;
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
