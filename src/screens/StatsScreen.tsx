import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CatMood, moodEmojis, moodLabels, DiaryEntry } from '../types';
import { getDiaryEntries, calculateStreak } from '../storage/diaryStorage';
import { exportDiaryData, importDiaryData } from '../utils/export';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const moods: CatMood[] = ['happy', 'sleepy', 'playful', 'hungry', 'relaxed'];

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!user?.id) return;
      try {
        setError(null);
        const data = await getDiaryEntries(user.id);
        if (!isActive()) return;
        setEntries(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
        if (isActive()) {
          setError('データの読み込みに失敗しました');
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

  async function handleExport() {
    if (!user?.id) return;
    if (entries.length === 0) {
      Alert.alert('エクスポートできません', '日記がありません');
      return;
    }

    setExporting(true);
    try {
      await exportDiaryData(user.id);
    } catch {
      Alert.alert('エラー', 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    if (!user?.id) return;
    setImporting(true);
    try {
      const result = await importDiaryData(user.id);
      if (result.success) {
        Alert.alert(
          'インポート完了',
          `${result.imported}件の日記をインポートしました${result.skipped > 0 ? `\n（${result.skipped}件はスキップ）` : ''}`
        );
        loadEntries();
      } else if (result.error) {
        Alert.alert('エラー', result.error);
      }
    } catch {
      Alert.alert('エラー', 'インポートに失敗しました');
    } finally {
      setImporting(false);
    }
  }

  const moodCounts = moods.reduce(
    (acc, mood) => {
      acc[mood] = entries.filter((e) => e.mood === mood).length;
      return acc;
    },
    {} as Record<CatMood, number>
  );

  const totalEntries = entries.length;
  const streakDays = calculateStreak(entries);
  const entriesWithPhotos = entries.filter((e) => e.photoUri).length;
  const mostCommonMood =
    totalEntries > 0
      ? moods.reduce((a, b) => (moodCounts[a] >= moodCounts[b] ? a : b))
      : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            loadEntries();
          }}
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEmoji}>📊</Text>
        <Text style={styles.summaryTitle}>日記の統計</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakNumber}>{streakDays}</Text>
          <Text style={styles.streakLabel}>日連続</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalEntries}</Text>
            <Text style={styles.summaryLabel}>総日記数</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{entriesWithPhotos}</Text>
            <Text style={styles.summaryLabel}>写真付き</Text>
          </View>
        </View>
        {mostCommonMood && (
          <View style={styles.mostCommon}>
            <Text style={styles.mostCommonLabel}>よくある気分</Text>
            <Text style={styles.mostCommonEmoji}>
              {moodEmojis[mostCommonMood]}
            </Text>
            <Text style={styles.mostCommonText}>
              {moodLabels[mostCommonMood]}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionTitle}>気分の分布</Text>
      {moods.map((mood) => {
        const count = moodCounts[mood];
        const percentage = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
        return (
          <View key={mood} style={styles.moodRow}>
            <Text style={styles.moodEmoji}>{moodEmojis[mood]}</Text>
            <View style={styles.moodBarContainer}>
              <View style={[styles.moodBar, { width: `${percentage}%` }]} />
            </View>
            <Text style={styles.moodCount}>{count}</Text>
          </View>
        );
      })}

      {totalEntries === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            日記を書くと統計が表示されます
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, exporting && styles.actionButtonDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>📤 エクスポート</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.importButton, importing && styles.actionButtonDisabled]}
          onPress={handleImport}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.actionButtonText}>📥 インポート</Text>
          )}
        </TouchableOpacity>
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorText: {
      fontSize: 16,
      color: colors.danger,
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
    content: {
      padding: spacing.xl,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    summaryEmoji: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      marginBottom: spacing.lg,
      gap: spacing.xs,
    },
    streakFire: {
      fontSize: 24,
    },
    streakNumber: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    streakLabel: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    summaryTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: spacing.lg,
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryValue: {
      fontSize: 36,
      fontWeight: 'bold',
      color: colors.primary,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    mostCommon: {
      alignItems: 'center',
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.backgroundMuted,
      width: '100%',
    },
    mostCommonLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    mostCommonEmoji: {
      fontSize: 40,
    },
    mostCommonText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.lg,
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    moodEmoji: {
      fontSize: 24,
      width: 40,
    },
    moodBarContainer: {
      flex: 1,
      height: 20,
      backgroundColor: colors.backgroundMuted,
      borderRadius: 10,
      marginHorizontal: spacing.sm,
      overflow: 'hidden',
    },
    moodBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 10,
    },
    moodCount: {
      width: 30,
      textAlign: 'right',
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      marginTop: spacing.xxl,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xxl,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      alignItems: 'center',
    },
    importButton: {
      backgroundColor: colors.textSecondary,
    },
    actionButtonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
