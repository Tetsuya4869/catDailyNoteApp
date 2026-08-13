import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Switch, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Appointment } from '../types';
import { getAppointments, saveAppointment, deleteAppointment } from '../storage/healthStorage';
import { RootStackParamList } from '../navigation/types';
import { dateOnlyToLocalDate, toDateOnly, todayDateOnly } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AppointmentEdit'>;
  route: RouteProp<RootStackParamList, 'AppointmentEdit'>;
};

export default function AppointmentEditScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const editId = route.params.id;
  const [type, setType] = useState<Appointment['type']>('vet');
  const [date, setDate] = useState(todayDateOnly());
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!editId) return;
    getAppointments().then((items) => {
      const item = items.find((a) => a.id === editId);
      if (!item) return;
      setType(item.type);
      setDate(item.date);
      setTitle(item.title);
      setNote(item.note ?? '');
      setDone(item.done);
    });
  }, [editId]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('入力確認', '予定名を入力してください');
      return;
    }
    await saveAppointment({
      id: editId || Date.now().toString(),
      catId: route.params.catId,
      type,
      date,
      title: title.trim(),
      note: note.trim() || undefined,
      done,
    });
    navigation.goBack();
  }

  function handleDelete() {
    if (!editId) return;
    Alert.alert('予定を削除', 'この予定を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => { await deleteAppointment(editId); navigation.goBack(); } },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>種類</Text>
        <View style={styles.row}>
          {(['vet', 'vaccine'] as const).map((item) => (
            <TouchableOpacity key={item} style={[styles.choice, type === item && styles.active]} onPress={() => setType(item)}>
              <Text style={styles.choiceEmoji}>{item === 'vet' ? '🏥' : '💉'}</Text>
              <Text style={[styles.choiceText, type === item && styles.activeText]}>{item === 'vet' ? '通院' : 'ワクチン'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>日付</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}><Text style={styles.inputText}>{date}</Text></TouchableOpacity>
        {showDatePicker && <DateTimePicker value={dateOnlyToLocalDate(date)} mode="date" onChange={(event, selected) => {
          setShowDatePicker(Platform.OS === 'ios');
          if (event.type === 'set' && selected) setDate(toDateOnly(selected));
        }} />}

        <Text style={styles.label}>予定名</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="定期健診、3種混合ワクチンなど" placeholderTextColor={colors.textPlaceholder} />
        <Text style={styles.label}>メモ</Text>
        <TextInput style={[styles.input, styles.note]} value={note} onChangeText={setNote} multiline textAlignVertical="top" placeholder="病院名や持ち物など" placeholderTextColor={colors.textPlaceholder} />

        {editId && <View style={styles.doneRow}><Text style={styles.doneLabel}>完了</Text><Switch value={done} onValueChange={setDone} trackColor={{ true: colors.primary, false: colors.border }} /></View>}
        {editId && <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}><Text style={styles.deleteText}>この予定を削除</Text></TouchableOpacity>}
      </ScrollView>
      <TouchableOpacity style={styles.save} onPress={handleSave}><Text style={styles.saveText}>保存する</Text></TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  label: { fontSize: 15, fontWeight: 'bold', color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  choice: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  active: { backgroundColor: colors.primary },
  choiceEmoji: { fontSize: 26 },
  choiceText: { color: colors.textSecondary, marginTop: 4 },
  activeText: { color: '#fff', fontWeight: 'bold' },
  input: { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, color: colors.text, marginBottom: spacing.xl },
  inputText: { color: colors.text, fontSize: 16 },
  note: { minHeight: 100 },
  doneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.xl },
  doneLabel: { color: colors.text, fontSize: 16 },
  deleteButton: { borderWidth: 1, borderColor: colors.danger, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  deleteText: { color: colors.danger, fontWeight: 'bold' },
  save: { margin: spacing.xl, backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.lg, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
