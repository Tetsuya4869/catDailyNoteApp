import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis } from '../types';
import { getRepository } from '../repositories';
import { RootStackParamList } from '../navigation/types';
import { dateOnlyToLocalDate } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const repository = getRepository();

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DayDetail'>;
  route: RouteProp<RootStackParamList, 'DayDetail'>;
};

export default function DayDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { date } = route.params;
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    repository.getDiaryEntries().then((all) => { if (active) setEntries(all.filter((entry) => entry.date === date)); });
    return () => { active = false; };
  }, [date]));

  const dateLabel = format(dateOnlyToLocalDate(date), 'yyyy年M月d日(E)', { locale: ja });
  return <View style={styles.container}>
    <Text style={styles.dateTitle}>{dateLabel}</Text>
    {entries.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>🐾</Text><Text style={styles.emptyText}>この日の記録はまだありません</Text></View> : <FlatList data={entries} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}>{item.photoUri && <Image source={{ uri: item.photoUri }} style={styles.photo} />}<View style={styles.body}><Text style={styles.title}>{moodEmojis[item.mood]} {item.title}</Text>{!!item.content && <Text style={styles.preview} numberOfLines={2}>{item.content}</Text>}</View></TouchableOpacity>} />}
    <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DiaryEntry', { date })}><Text style={styles.fabText}>＋</Text></TouchableOpacity>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, dateTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, padding: spacing.xl }, list: { paddingHorizontal: spacing.xl, paddingBottom: 100 }, card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.md }, photo: { width: '100%', height: 160 }, body: { padding: spacing.lg }, title: { fontSize: 17, fontWeight: 'bold', color: colors.text }, preview: { marginTop: spacing.sm, color: colors.textSecondary, lineHeight: 20 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center' }, emptyEmoji: { fontSize: 56, marginBottom: spacing.md }, emptyText: { color: colors.textMuted }, fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xl, width: 60, height: 60, borderRadius: borderRadius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, fabText: { color: '#fff', fontSize: 30 },
});
