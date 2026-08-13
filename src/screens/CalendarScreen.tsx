import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis } from '../types';
import { getRepository } from '../repositories';
import { RootStackParamList } from '../navigation/types';
import { toDateOnly } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const repository = getRepository();

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { selectedCatId } = useCats();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    repository.getDiaryEntries().then((data) => {
      if (!active) return;
      setEntries(selectedCatId ? data.filter((entry) => entry.catId === selectedCatId) : data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [selectedCatId]));

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const entry of entries) { const items = map.get(entry.date) ?? []; items.push(entry); map.set(entry.date, items); }
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    return [...Array(getDay(start)).fill(null), ...eachDayOfInterval({ start, end: endOfMonth(currentMonth) })] as (Date | null)[];
  }, [currentMonth]);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return <ScrollView style={styles.container}>
    <View style={styles.header}><TouchableOpacity onPress={() => setCurrentMonth((m) => subMonths(m, 1))} style={styles.navButton}><Text style={styles.navText}>◀</Text></TouchableOpacity><Text style={styles.month}>{format(currentMonth, 'yyyy年M月', { locale: ja })}</Text><TouchableOpacity onPress={() => setCurrentMonth((m) => addMonths(m, 1))} style={styles.navButton}><Text style={styles.navText}>▶</Text></TouchableOpacity></View>
    <View style={styles.weekRow}>{WEEKDAYS.map((label, index) => <Text key={label} style={[styles.weekText, index === 0 && { color: colors.sunday }, index === 6 && { color: colors.saturday }]}>{label}</Text>)}</View>
    <View style={styles.grid}>{calendarDays.map((day, index) => {
      if (!day) return <View key={`blank-${index}`} style={styles.cell} />;
      const key = toDateOnly(day); const dayEntries = entriesByDate.get(key) ?? []; const today = isSameDay(day, new Date()); const dow = getDay(day);
      return <TouchableOpacity key={key} style={[styles.cell, today && styles.today]} onPress={() => navigation.navigate('DayDetail', { date: key })}><Text style={[styles.day, dow === 0 && { color: colors.sunday }, dow === 6 && { color: colors.saturday }, today && styles.todayText]}>{format(day, 'd')}</Text>{dayEntries.length > 0 && <Text style={styles.mood}>{moodEmojis[dayEntries[0].mood]}{dayEntries.length > 1 ? ` +${dayEntries.length - 1}` : ''}</Text>}</TouchableOpacity>;
    })}</View>
    <Text style={styles.legend}>日付をタップすると、その日の記録一覧を開きます</Text>
  </ScrollView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }, navButton: { padding: spacing.sm }, navText: { color: colors.primary, fontSize: 18 }, month: { color: colors.text, fontSize: 20, fontWeight: 'bold' }, weekRow: { flexDirection: 'row', paddingHorizontal: spacing.sm }, weekText: { width: '14.28%', textAlign: 'center', paddingVertical: spacing.sm, color: colors.textSecondary, fontWeight: 'bold' }, grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm }, cell: { width: '14.28%', aspectRatio: 0.9, justifyContent: 'center', alignItems: 'center', padding: 2 }, today: { backgroundColor: colors.primary, borderRadius: borderRadius.md }, day: { color: colors.text }, todayText: { color: '#fff', fontWeight: 'bold' }, mood: { fontSize: 11, marginTop: 3, color: colors.textSecondary }, legend: { textAlign: 'center', color: colors.textMuted, fontSize: 12, padding: spacing.xl } });
