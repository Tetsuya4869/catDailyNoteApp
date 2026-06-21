import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getThemePreference,
  saveThemePreference,
  getReminderSettings,
  saveReminderSettings,
  defaultReminderSettings,
} from '../settingsStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('settingsStorage - theme', () => {
  it('defaults to "system" when nothing is saved', async () => {
    const preference = await getThemePreference();
    expect(preference).toBe('system');
  });

  it('persists and retrieves a saved preference', async () => {
    await saveThemePreference('dark');
    const preference = await getThemePreference();
    expect(preference).toBe('dark');
  });

  it('falls back to "system" for an invalid stored value', async () => {
    await AsyncStorage.setItem('@cat_diary_theme_preference', 'rainbow');
    const preference = await getThemePreference();
    expect(preference).toBe('system');
  });
});

describe('settingsStorage - reminder', () => {
  it('returns default settings when nothing is saved', async () => {
    const settings = await getReminderSettings();
    expect(settings).toEqual(defaultReminderSettings);
  });

  it('persists and retrieves reminder settings', async () => {
    await saveReminderSettings({ enabled: true, hour: 8, minute: 30 });
    const settings = await getReminderSettings();
    expect(settings).toEqual({ enabled: true, hour: 8, minute: 30 });
  });

  it('falls back to defaults for corrupted JSON', async () => {
    await AsyncStorage.setItem('@cat_diary_reminder', 'not-json');
    const settings = await getReminderSettings();
    expect(settings).toEqual(defaultReminderSettings);
  });

  it('fills missing fields with defaults', async () => {
    await AsyncStorage.setItem(
      '@cat_diary_reminder',
      JSON.stringify({ enabled: true })
    );
    const settings = await getReminderSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.hour).toBe(defaultReminderSettings.hour);
    expect(settings.minute).toBe(defaultReminderSettings.minute);
  });
});
