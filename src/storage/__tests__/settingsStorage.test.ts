import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getThemePreference,
  saveThemePreference,
} from '../settingsStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('settingsStorage', () => {
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
