import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis, catColorEmojis } from '../types';
import { getRepository } from '../repositories';
import { RootStackParamList } from '../navigation/types';
import { dateOnlyToLocalDate } from '../utils/date';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Section = { title: string; data: DiaryEntry[] };
const repository = getRepository();

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cats, selectedCatId, setSelectedCatId } = useCats();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async (isActive: () => boolean = () => true) => {
    const data = await repository.getDiaryEntries();
    if (!isActive()) return;
    setEntries([...data].sort((a, b) => b.date.localeCompare(a.date)));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    loadEntries(() => active);
    return () => { active = false; };
  }, [loadEntries]));

  async function handleRefresh() {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }

  async function handleToggleFavorite(item: DiaryEntry) {
    const updated = { ...item, favorite: !item.favorite };
    await repository.saveDiaryEntry(updated);
    setEntries((prev) => prev.map((e) => e.id === item.id ? updated : e));
  }

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (selectedCatId) result = result.filter((e) => e.catId === selectedCatId);
    if (favoritesOnly) result = result.filter((e) => e.favorite);
    const q = searchQuery.trim().toLowerCase();
    if (q) result = result.filter((e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
    return result;
  }, [entries, selectedCatId, favoritesOnly, searchQuery]);

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, DiaryEntry[]>();
    for (const entry of filteredEntries) {
      const key = format(dateOnlyToLocalDate(entry.date), 'yyyy年M月', { locale: ja });
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [filteredEntries]);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.container}>
      {cats.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroller} contentContainerStyle={styles.catChips}>
          <TouchableOpacity style={[styles.catChip, !selectedCatId && styles.catChipActive]} onPress={() => setSelectedCatId(null)}><Text style={[styles.catChipText, !selectedCatId && styles.catChipTextActive]}>すべて</Text></TouchableOpacity>
          {cats.map((cat) => <TouchableOpacity key={cat.id} style={[styles.catChip, selectedCatId === cat.id && styles.catChipActive]} onPress={() => setSelectedCatId(cat.id)}><Text style={[styles.catChipText, selectedCatId === cat.id && styles.catChipTextActive]}>{catColorEmojis[cat.color]} {cat.name}</Text></TouchableOpacity>)}
        </ScrollView>
      )}
      {entries.length > 0 && <View style={styles.searchRow}><TextInput style={styles.searchInput} placeholder="🔍 日記を検索..." placeholderTextColor={colors.textPlaceholder} value={searchQuery} onChangeText={setSearchQuery} /><TouchableOpacity style={[styles.favoriteButton, favoritesOnly && styles.favoriteButtonActive]} onPress={() => setFavoritesOnly((v) => !v)}><Text style={styles.favoriteText}>{favoritesOnly ? '⭐' : '☆'}</Text></TouchableOpacity></View>}
      {filteredEntries.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>{entries.length === 0 ? '🐱' : '🔍'}</Text><Text style={styles.emptyText}>{entries.length === 0 ? 'まだ日記がありません' : '条件に合う日記がありません'}</Text></View> : <SectionList sections={sections} keyExtractor={(item) => item.id} stickySectionHeadersEnabled={false} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />} renderSectionHeader={({ section }) => <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section.title}</Text><Text style={styles.sectionCount}>{section.data.length}件</Text></View>} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}>{item.photoUri && <Image source={{ uri: item.photoUri }} style={styles.photo} />}<View style={styles.cardBody}><View style={styles.cardHeader}><Text style={styles.date}>{format(dateOnlyToLocalDate(item.date), 'M月d日(E)', { locale: ja })}</Text><View style={styles.cardActions}><Text style={styles.mood}>{moodEmojis[item.mood]}</Text><TouchableOpacity onPress={() => handleToggleFavorite(item)}><Text style={styles.star}>{item.favorite ? '⭐' : '☆'}</Text></TouchableOpacity></View></View><Text style={styles.title} numberOfLines={1}>{item.title}</Text>{!!item.content && <Text style={styles.preview} numberOfLines={2}>{item.content}</Text>}</View></TouchableOpacity>} />}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }, catScroller: { maxHeight: 56 }, catChips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm }, catChip: { backgroundColor: colors.card, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, catChipActive: { backgroundColor: colors.primary }, catChipText: { color: colors.textSecondary, fontWeight: '600' }, catChipTextActive: { color: '#fff' }, searchRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, flexDirection: 'row', gap: spacing.sm }, searchInput: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text }, favoriteButton: { width: 48, backgroundColor: colors.card, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' }, favoriteButtonActive: { backgroundColor: colors.primary }, favoriteText: { fontSize: 22 }, list: { padding: spacing.lg, paddingBottom: 80 }, sectionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginVertical: spacing.sm }, sectionTitle: { color: colors.primary, fontSize: 18, fontWeight: 'bold' }, sectionCount: { color: colors.textMuted, fontSize: 12 }, card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.md }, photo: { width: '100%', height: 160 }, cardBody: { padding: spacing.lg }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }, cardActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, date: { color: colors.textMuted, fontSize: 13 }, mood: { fontSize: 22 }, star: { fontSize: 20 }, title: { color: colors.text, fontSize: 18, fontWeight: 'bold' }, preview: { color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center' }, emptyEmoji: { fontSize: 64, marginBottom: spacing.md }, emptyText: { color: colors.textMuted, fontSize: 16 },
});
