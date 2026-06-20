// Color palette based on the "猫日記 画面構成" wireframe.
// クリーム / ピーチ / テラコッタ / ブラウン / テキスト
export const lightColors = {
  primary: '#E0976A', // テラコッタ — 強調・選択
  peach: '#F1D4B5', // ピーチ — アクセント面・ヘッダー
  brown: '#B08862', // ブラウン — セカンダリ・カテゴリ
  background: '#FBF1E6', // クリーム
  card: '#FFFCF8',
  text: '#4A3B2E', // テキスト（濃ブラウン）
  textSecondary: '#7A6A5A',
  textMuted: '#A8998A',
  textPlaceholder: '#B8AB9C',
  border: '#E5D8C8',
  backgroundMuted: '#F3E4D2',
  danger: '#D9694E',
  shadow: '#000000',
  tabBar: '#FFFCF8',
  sunday: '#D9694E',
  saturday: '#6A8CC7',
} as const;

export const darkColors = {
  primary: '#E0976A',
  peach: '#3A2E24',
  brown: '#C9A079',
  background: '#1E1A16',
  card: '#2A241E',
  text: '#F0E8DF',
  textSecondary: '#C2B5A6',
  textMuted: '#8A7D6E',
  textPlaceholder: '#6E6358',
  border: '#3E362E',
  backgroundMuted: '#332B23',
  danger: '#E07A60',
  shadow: '#000000',
  tabBar: '#2A241E',
  sunday: '#E07A60',
  saturday: '#88A4D6',
} as const;

export type ThemeColors = Record<keyof typeof lightColors, string>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 30,
} as const;

// Legacy export for backward compatibility during migration
export const colors = lightColors;
