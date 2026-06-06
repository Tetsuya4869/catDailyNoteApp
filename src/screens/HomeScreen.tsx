import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis } from '../types';
import { getDiaryEntries } from '../storage/diaryStorage';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing, borderRadius } from '../constants/theme';

type Section = {
  title: string;
  data: DiaryEntry[];
};

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    const data = await getDiaryEntries();
    const sorted = [...data].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setEntries(sorted);
  }

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, DiaryEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = format(new Date(entry.date), 'yyyy年M月', { locale: ja });
      const arr = groups.get(key) || [];
      arr.push(entry);
      groups.set(key, arr);
    });
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [filteredEntries]);

  function renderItem({ item }: { item: DiaryEntry }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}
      >
        {item.photoUri && (
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>
              {format(new Date(item.date), 'M月d日(E)', { locale: ja })}
            </Text>
            <Text style={styles.mood}>{moodEmojis[item.mood]}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.content && (
            <Text style={styles.preview} numberOfLines={2}>
              {item.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderSectionHeader({ section }: { section: Section }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <Text style={styles.sectionHeaderCount}>{section.data.length}件</Text>
      </View>
    );
  }

  const showEmpty = entries.length === 0;
  const showNoResults = entries.length > 0 && filteredEntries.length === 0;

  return (
    <View style={styles.container}>
      {entries.length > 0 && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 日記を検索..."
            placeholderTextColor={colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {showEmpty && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🐱</Text>
          <Text style={styles.emptyText}>まだ日記がありません</Text>
          <Text style={styles.emptySubText}>右下のボタンから追加してね</Text>
        </View>
      )}

      {showNoResults && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>見つかりませんでした</Text>
        </View>
      )}

      {!showEmpty && !showNoResults && (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('DiaryEntry', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
  },
  list: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  sectionHeaderCount: {
    fontSize: 12,
    color: colors.textPlaceholder,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 150,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: 14,
    color: colors.textMuted,
  },
  mood: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  preview: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textPlaceholder,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: colors.white,
    lineHeight: 36,
  },
});
