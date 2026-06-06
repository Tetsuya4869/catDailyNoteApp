import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_PREFERENCE_KEY = '@cat_diary_theme_preference';
const REMINDER_KEY = '@cat_diary_reminder';

export async function getThemePreference(): Promise<ThemePreference> {
  const value = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
}

export async function saveThemePreference(
  preference: ThemePreference
): Promise<void> {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
}

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const defaultReminderSettings: ReminderSettings = {
  enabled: false,
  hour: 21,
  minute: 0,
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  const json = await AsyncStorage.getItem(REMINDER_KEY);
  if (!json) return { ...defaultReminderSettings };
  try {
    const parsed = JSON.parse(json) as Partial<ReminderSettings>;
    return {
      enabled: parsed.enabled ?? defaultReminderSettings.enabled,
      hour: parsed.hour ?? defaultReminderSettings.hour,
      minute: parsed.minute ?? defaultReminderSettings.minute,
    };
  } catch {
    return { ...defaultReminderSettings };
  }
}

export async function saveReminderSettings(
  settings: ReminderSettings
): Promise<void> {
  await AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}
