export const lightColors = {
  primary: '#FF9966',
  background: '#FFF5E6',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#888888',
  textPlaceholder: '#999999',
  border: '#D0C4B8',
  backgroundMuted: '#E8E0D5',
  danger: '#E55555',
  shadow: '#000000',
  tabBar: '#FFFFFF',
  sunday: '#E55555',
  saturday: '#5577EE',
} as const;

export const darkColors = {
  primary: '#FF9966',
  background: '#1A1A1A',
  card: '#2D2D2D',
  text: '#EEEEEE',
  textSecondary: '#BBBBBB',
  textMuted: '#888888',
  textPlaceholder: '#666666',
  border: '#444444',
  backgroundMuted: '#333333',
  danger: '#FF6666',
  shadow: '#000000',
  tabBar: '#2D2D2D',
  sunday: '#FF7777',
  saturday: '#7799FF',
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
  full: 30,
} as const;

// Legacy export for backward compatibility during migration
export const colors = lightColors;
