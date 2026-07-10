import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ReminderSettings } from '../storage/settingsStorage';
import { Appointment } from '../types';

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

// 毎日のリマインダーは固定 identifier で管理し、
// 予定通知（appt-*）を巻き込まずにキャンセルできるようにする
const DAILY_REMINDER_ID = 'daily-reminder';

function appointmentNotificationId(appointmentId: string): string {
  return `appt-${appointmentId}`;
}

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
    identifier: DAILY_REMINDER_ID,
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
  // 予定通知を残すため、毎日のリマインダーだけをキャンセルする
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

// ===== 予定（通院・ワクチン）の通知 =====

export async function scheduleAppointmentNotification(
  appointment: Appointment,
  catName?: string
): Promise<void> {
  const fireDate = new Date(appointment.date);
  if (isNaN(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
    return; // 過去の予定には通知しない
  }

  const granted = await requestNotificationPermission();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('appointments', {
      name: '通院・ワクチンの予定',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const typeEmoji = appointment.type === 'vaccine' ? '💉' : '🏥';
  await Notifications.scheduleNotificationAsync({
    identifier: appointmentNotificationId(appointment.id),
    content: {
      title: `${typeEmoji} 予定のお知らせ`,
      body: catName
        ? `${catName}: ${appointment.title}`
        : appointment.title,
    },
    trigger: {
      date: fireDate,
      channelId: Platform.OS === 'android' ? 'appointments' : undefined,
    },
  });
}

export async function cancelAppointmentNotification(
  appointmentId: string
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(
    appointmentNotificationId(appointmentId)
  );
}
