import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderSettings } from '../storage/settingsStorage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const REMINDER_MESSAGES = [
  '今日の猫ちゃんの様子を記録しよう 🐱',
  '日記の時間です。今日はどんな一日だった？ 📖',
  '猫との思い出を残しませんか？ 😺',
];

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleReminder(
  settings: ReminderSettings
): Promise<boolean> {
  await cancelReminder();

  if (!settings.enabled) {
    return true;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminder', {
      name: '日記リマインダー',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const message =
    REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐱 猫の日記',
      body: message,
    },
    trigger: {
      hour: settings.hour,
      minute: settings.minute,
      repeats: true,
      channelId: Platform.OS === 'android' ? 'reminder' : undefined,
    },
  });

  return true;
}

export async function cancelReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
