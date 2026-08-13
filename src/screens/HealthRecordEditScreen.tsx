import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HealthType, healthTypeEmojis, healthTypeLabels } from '../types';
import { saveHealthRecord } from '../storage/healthStorage';
import { RootStackParamList } from '../navigation/types';
import { dateOnlyToLocalDate, toDateOnly, todayDateOnly } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'HealthRecordEdit'>;
  route: RouteProp<RootStackParamList, 'HealthRecordEdit'>;
};

const types: HealthType[] = ['weight', 'vet', 'vaccine', 'medication'];

export default function HealthRecordEditScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [type, setType] = useState<HealthType>(route.params.type ?? 'weight');
  const [date, setDate] = useState(todayDateOnly());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [weight, setWeight] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  async function handleSave() {
    const weightKg = type === 'weight' ? Number(weight) : undefined;
    if (type === 'weight' && (!Number.isFinite(weightKg) || (weightKg ?? 0) <= 0)) {
      Alert.alert('入力確認', '体重を正しく入力してください');
      return;
    }
    await saveHealthRecord({
      id: Date.now().toString(),
      catId: route.params.catId,
      type,
      date,
      weightKg,
      title: title.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>記録タイプ</Text>
        <View style={styles.typeGrid}>
          {types.map((item) => (
            <TouchableOpacity key={item} style={[styles.typeButton, item === type && styles.active]} onPress={() => setType(item)}>
              <Text style={styles.typeEmoji}>{healthTypeEmojis[item]}</Text>
              <Text style={[styles.typeText, item === type && styles.activeText]}>{healthTypeLabels[item]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>日付</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>{date}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={dateOnlyToLocalDate(date)} mode="date" maximumDate={new Date()} onChange={(event, selected) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (event.type === 'set' && selected) setDate(toDateOnly(selected));
          }} />
        )}

        {type === 'weight' ? (
          <>
            <Text style={styles.label}>体重 (kg)</Text>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="4.2" placeholderTextColor={colors.textPlaceholder} />
          </>
        ) : (
          <>
            <Text style={styles.label}>名称</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={`${healthTypeLabels[type]}の内容`} placeholderTextColor={colors.textPlaceholder} />
          </>
        )}

        <Text style={styles.label}>メモ</Text>
        <TextInput style={[styles.input, styles.note]} value={note} onChangeText={setNote} multiline textAlignVertical="top" placeholder="様子や獣医師からの説明など" placeholderTextColor={colors.textPlaceholder} />
      </ScrollView>
      <TouchableOpacity style={styles.save} onPress={handleSave}><Text style={styles.saveText}>保存する</Text></TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  label: { fontSize: 15, fontWeight: 'bold', color: colors.textSecondary, marginBottom: spacing.sm },
  typeGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  typeButton: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center' },
  active: { backgroundColor: colors.primary },
  typeEmoji: { fontSize: 24 },
  typeText: { fontSize: 10, color: colors.textSecondary, marginTop: 4 },
  activeText: { color: '#fff', fontWeight: 'bold' },
  input: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, color: colors.text, marginBottom: spacing.xl },
  inputText: { color: colors.text, fontSize: 16 },
  note: { minHeight: 120 },
  save: { margin: spacing.xl, backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
