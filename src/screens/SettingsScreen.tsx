import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../navigation/types';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ThemePreference,
  ReminderSettings,
  getReminderSettings,
  saveReminderSettings,
} from '../storage/settingsStorage';
import { scheduleReminder } from '../utils/notifications';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const themeOptions: { value: ThemePreference; label: string; emoji: string }[] = [
  { value: 'system', label: 'システム設定に従う', emoji: '⚙️' },
  { value: 'light', label: 'ライトモード', emoji: '☀️' },
  { value: 'dark', label: 'ダークモード', emoji: '🌙' },
];

function reminderTimeToDate(settings: ReminderSettings): Date {
  const date = new Date();
  date.setHours(settings.hour, settings.minute, 0, 0);
  return date;
}

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [reminder, setReminder] = useState<ReminderSettings | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  function handleSignOut() {
    Alert.alert(
      'ログアウト',
      '本当にログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログアウト', style: 'destructive', onPress: signOut },
      ]
    );
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getReminderSettings().then((settings) => {
        if (active) setReminder(settings);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  async function applyReminder(next: ReminderSettings) {
    setReminder(next);
    await saveReminderSettings(next);
    const ok = await scheduleReminder(next);
    if (!ok && next.enabled) {
      Alert.alert(
        '通知が許可されていません',
        '端末の設定からこのアプリの通知を許可してください'
      );
      const reverted = { ...next, enabled: false };
      setReminder(reverted);
      await saveReminderSettings(reverted);
    }
  }

  function handleToggle(value: boolean) {
    if (!reminder) return;
    applyReminder({ ...reminder, enabled: value });
  }

  function handleTimeChange(_event: unknown, selectedDate?: Date) {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate && reminder) {
      applyReminder({
        ...reminder,
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      });
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>アカウント</Text>
      <View style={styles.card}>
        <View style={[styles.option, styles.optionBorder]}>
          <Text style={styles.optionEmoji}>👤</Text>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.displayName || user?.email || 'ユーザー'}
            </Text>
            {user?.email && (
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.option} onPress={handleSignOut}>
          <Text style={styles.optionEmoji}>🚪</Text>
          <Text style={styles.logoutLabel}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>テーマ</Text>
      <View style={styles.card}>
        {themeOptions.map((option, index) => {
          const selected = preference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                index < themeOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={() => setPreference(option.value)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>リマインダー</Text>
      <View style={styles.card}>
        <View style={[styles.option, reminder?.enabled && styles.optionBorder]}>
          <Text style={styles.optionEmoji}>🔔</Text>
          <Text style={styles.optionLabel}>毎日のリマインダー</Text>
          <Switch
            value={reminder?.enabled ?? false}
            onValueChange={handleToggle}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>
        {reminder?.enabled && (
          <TouchableOpacity
            style={styles.option}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.optionEmoji}>⏰</Text>
            <Text style={styles.optionLabel}>通知時刻</Text>
            <Text style={styles.optionValue}>
              {format(reminderTimeToDate(reminder), 'HH:mm')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showTimePicker && reminder && (
        <DateTimePicker
          value={reminderTimeToDate(reminder)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      <Text style={styles.sectionTitle}>記録</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate('Stats')}
        >
          <Text style={styles.optionEmoji}>📊</Text>
          <Text style={styles.optionLabel}>統計を見る</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>このアプリについて</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>アプリ名</Text>
          <Text style={styles.infoValue}>猫の日記</Text>
        </View>
        <View style={[styles.infoRow, styles.optionBorder]} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>バージョン</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerEmoji}>🐱</Text>
        <Text style={styles.footerText}>猫との毎日を大切に</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textMuted,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xxl,
      overflow: 'hidden',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
    },
    optionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundMuted,
    },
    optionEmoji: {
      fontSize: 20,
      marginRight: spacing.md,
    },
    optionLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    optionValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    checkmark: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    chevron: {
      fontSize: 22,
      color: colors.textMuted,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text,
    },
    infoValue: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    footer: {
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    footerEmoji: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    footerText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    userEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    logoutLabel: {
      flex: 1,
      fontSize: 16,
      color: '#E53935',
    },
  });
