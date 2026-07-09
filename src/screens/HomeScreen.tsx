import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis, catColorEmojis } from '../types';
import { getDiaryEntries, saveDiaryEntry } from '../storage/diaryStorage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Section = {
  title: string;
  data: DiaryEntry[];
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cats, selectedCatId, setSelectedCatId } = useCats();
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!user?.id) return;
      try {
        setError(null);
        const data = await getDiaryEntries(user.id);
        if (!isActive()) return;
        const sorted = [...data].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setEntries(sorted);
      } catch (err) {
        console.error('Failed to load diary entries:', err);
        if (isActive()) {
          setError('日記の読み込みに失敗しました');
        }
      } finally {
        if (isActive()) {
          setLoading(false);
        }
      }
    },
    [user?.id]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadEntries(() => active);
      return () => {
        active = false;
      };
    }, [loadEntries])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }

  async function handleToggleFavorite(item: DiaryEntry) {
    if (!user?.id) return;
    const updated = { ...item, favorite: !item.favorite };
    // 楽観更新: 先に UI を反映
    setEntries((prev) => prev.map((e) => (e.id === item.id ? updated : e)));
    Haptics.selectionAsync();
    try {
      await saveDiaryEntry(updated, user.id);
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // 失敗したら元に戻す
      setEntries((prev) => prev.map((e) => (e.id === item.id ? item : e)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (selectedCatId) {
      result = result.filter((e) => e.catId === selectedCatId);
    }
    if (favoritesOnly) {
      result = result.filter((e) => e.favorite);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entries, searchQuery, selectedCatId, favoritesOnly]);

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
            <View style={styles.cardHeaderRight}>
              <Text style={styles.mood}>{moodEmojis[item.mood]}</Text>
              <TouchableOpacity
                onPress={() => handleToggleFavorite(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityState={{ selected: !!item.favorite }}
                accessibilityLabel={
                  item.favorite ? 'お気に入りを解除' : 'お気に入りに追加'
                }
              >
                <Text style={styles.star}>{item.favorite ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            </View>
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

  const showEmpty = !loading && entries.length === 0;
  const showNoResults = entries.length > 0 && filteredEntries.length === 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          <TouchableOpacity
            style={[styles.favoriteFilter, favoritesOnly && styles.favoriteFilterActive]}
            onPress={() => setFavoritesOnly((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ selected: favoritesOnly }}
            accessibilityLabel="お気に入りのみ表示"
          >
            <Text style={styles.favoriteFilterText}>
              {favoritesOnly ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {cats.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContainer}
        >
          <TouchableOpacity
            style={[styles.chip, !selectedCatId && styles.chipActive]}
            onPress={() => setSelectedCatId(null)}
            accessibilityRole="button"
            accessibilityState={{ selected: !selectedCatId }}
            accessibilityLabel="すべての猫の日記を表示"
          >
            <Text
              style={[styles.chipText, !selectedCatId && styles.chipTextActive]}
            >
              🐾 すべて
            </Text>
          </TouchableOpacity>
          {cats.map((cat) => {
            const active = selectedCatId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCatId(active ? null : cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${cat.name}の日記を表示`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {catColorEmojis[cat.color]} {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {showEmpty && !error && (
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('DiaryEntry', {})}
        accessibilityRole="button"
        accessibilityLabel="新しい日記を書く"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    searchContainer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      flexDirection: 'row',
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 16,
      color: colors.text,
    },
    favoriteFilter: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      width: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteFilterActive: {
      backgroundColor: colors.primary,
    },
    favoriteFilterText: {
      fontSize: 22,
    },
    chipScroll: {
      marginTop: spacing.sm,
      maxHeight: 44,
    },
    chipContainer: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      alignItems: 'center',
    },
    chip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    chipTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
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
      backgroundColor: colors.card,
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
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    date: {
      fontSize: 14,
      color: colors.textMuted,
    },
    mood: {
      fontSize: 24,
    },
    star: {
      fontSize: 20,
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
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
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
      color: '#FFFFFF',
      lineHeight: 36,
    },
  });
