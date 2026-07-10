import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  HealthRecord,
  HealthType,
  Appointment,
  healthTypeEmojis,
  healthTypeLabels,
} from '../types';
import { saveHealthRecord, saveAppointment } from '../storage/healthStorage';
import { scheduleAppointmentNotification } from '../utils/notifications';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'HealthEntry'>;
  route: RouteProp<RootStackParamList, 'HealthEntry'>;
};

const recordTypes: HealthType[] = ['weight', 'vet', 'vaccine', 'medication'];
const appointmentTypes: Appointment['type'][] = ['vet', 'vaccine'];

export default function HealthEntryScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { cats } = useCats();
  const { catId, mode } = route.params;
  const cat = cats.find((c) => c.id === catId);

  const isAppointment = mode === 'appointment';
  const [recordType, setRecordType] = useState<HealthType>('weight');
  const [apptType, setApptType] = useState<Appointment['type']>('vet');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDateChange(_event: unknown, selectedDate?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  }

  async function handleSave() {
    if (!user?.id) return;

    if (isAppointment) {
      if (!title.trim()) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('エラー', '予定のタイトルを入力してください');
        return;
      }
    } else if (recordType === 'weight') {
      const weight = parseFloat(weightText);
      if (isNaN(weight) || weight <= 0 || weight >= 100) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('エラー', '体重を正しく入力してください（例: 4.2）');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      if (isAppointment) {
        const appointment: Appointment = {
          id: Date.now().toString(),
          catId,
          type: apptType,
          date: date.toISOString(),
          title: title.trim(),
          note: note.trim() || undefined,
          done: false,
        };
        await saveAppointment(appointment, user.id);
        // 予定時刻に通知を出す（権限がなければ静かにスキップ）
        try {
          await scheduleAppointmentNotification(appointment, cat?.name);
        } catch (err) {
          console.error('Failed to schedule appointment notification:', err);
        }
      } else {
        const record: HealthRecord = {
          id: Date.now().toString(),
          catId,
          type: recordType,
          date: date.toISOString(),
          weightKg:
            recordType === 'weight' ? parseFloat(weightText) : undefined,
          title: title.trim() || undefined,
          note: note.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        await saveHealthRecord(record, user.id);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save health entry:', err);
      setError('保存に失敗しました');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {cat && (
          <Text style={styles.catName}>
            🐱 {cat.name}の{isAppointment ? '予定' : '健康記録'}
          </Text>
        )}

        <Text style={styles.label}>種類</Text>
        <View style={styles.typeContainer}>
          {(isAppointment ? appointmentTypes : recordTypes).map((t) => {
            const active = isAppointment ? apptType === t : recordType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, active && styles.typeButtonActive]}
                onPress={() =>
                  isAppointment
                    ? setApptType(t as Appointment['type'])
                    : setRecordType(t as HealthType)
                }
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={healthTypeLabels[t as HealthType]}
              >
                <Text style={styles.typeEmoji}>
                  {healthTypeEmojis[t as HealthType]}
                </Text>
                <Text
                  style={[styles.typeLabel, active && styles.typeLabelActive]}
                >
                  {healthTypeLabels[t as HealthType]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{isAppointment ? '予定日' : '日付'}</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
          accessibilityLabel="日付を選択"
        >
          <Text style={styles.dateButtonValue}>
            {format(date, 'yyyy年M月d日(E)', { locale: ja })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={isAppointment ? undefined : new Date()}
            minimumDate={isAppointment ? new Date() : undefined}
          />
        )}

        {!isAppointment && recordType === 'weight' ? (
          <>
            <Text style={styles.label}>体重 (kg)</Text>
            <TextInput
              style={styles.input}
              value={weightText}
              onChangeText={setWeightText}
              placeholder="4.2"
              placeholderTextColor={colors.textPlaceholder}
              keyboardType="decimal-pad"
              maxLength={5}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>
              タイトル{isAppointment ? '' : '（任意）'}
            </Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={
                isAppointment ? '定期健診、狂犬病ワクチンなど' : '内容を入力'
              }
              placeholderTextColor={colors.textPlaceholder}
            />
          </>
        )}

        <Text style={styles.label}>メモ（任意）</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="気になることをメモ"
          placeholderTextColor={colors.textPlaceholder}
          multiline
          textAlignVertical="top"
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={isAppointment ? '予定を保存' : '記録を保存'}
        accessibilityState={{ disabled: saving }}
      >
        <Text style={styles.saveButtonText}>
          {saving ? '保存中...' : '保存する'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: spacing.xl,
    },
    catName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.xl,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    typeContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    typeButton: {
      flex: 1,
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.card,
    },
    typeButtonActive: {
      backgroundColor: colors.primary,
    },
    typeEmoji: {
      fontSize: 24,
      marginBottom: spacing.xs,
    },
    typeLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    typeLabelActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    dateButton: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.xxl,
    },
    dateButtonValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.xxl,
    },
    noteInput: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      marginBottom: spacing.xxl,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    saveButton: {
      backgroundColor: colors.primary,
      margin: spacing.xl,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
