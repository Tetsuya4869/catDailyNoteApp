import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CatMood, moodEmojis, moodLabels, DiaryEntry } from '../types';
import { getDiaryEntries } from '../storage/diaryStorage';
import { colors, spacing, borderRadius } from '../constants/theme';

const moods: CatMood[] = ['happy', 'sleepy', 'playful', 'hungry', 'relaxed'];

export default function StatsScreen() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    const data = await getDiaryEntries();
    setEntries(data);
  }

  const moodCounts = moods.reduce(
    (acc, mood) => {
      acc[mood] = entries.filter((e) => e.mood === mood).length;
      return acc;
    },
    {} as Record<CatMood, number>
  );

  const totalEntries = entries.length;
  const entriesWithPhotos = entries.filter((e) => e.photoUri).length;
  const mostCommonMood =
    totalEntries > 0
      ? moods.reduce((a, b) => (moodCounts[a] >= moodCounts[b] ? a : b))
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEmoji}>📊</Text>
        <Text style={styles.summaryTitle}>日記の統計</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  summaryEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
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
});
