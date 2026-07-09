import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis } from '../types';
import { getDiaryEntries } from '../storage/diaryStorage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const loadEntries = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!user?.id) return;
      try {
        setError(null);
        const data = await getDiaryEntries(user.id);
        if (!isActive()) return;
        setEntries(data);
      } catch (err) {
        console.error('Failed to load entries for calendar:', err);
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

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    entries.forEach((entry) => {
      const key = format(new Date(entry.date), 'yyyy-MM-dd');
      const arr = map.get(key) || [];
      arr.push(entry);
      map.set(key, arr);
    });
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    const startPadding = getDay(start);
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    return [...paddedDays, ...days];
  }, [currentMonth]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }

  function goToPreviousMonth() {
    setSelectedDayKey(null);
    setCurrentMonth((m) => subMonths(m, 1));
  }

  function goToNextMonth() {
    setSelectedDayKey(null);
    setCurrentMonth((m) => addMonths(m, 1));
  }

  function handleDayPress(day: Date) {
    const key = format(day, 'yyyy-MM-dd');
    const dayEntries = entriesByDate.get(key);
    if (dayEntries && dayEntries.length > 0) {
      // 複数件ある場合はパネルで一覧を表示（先頭固定で開かない）
      setSelectedDayKey((prev) => (prev === key ? null : key));
    } else {
      // 日記がない日はその日付で新規作成
      setSelectedDayKey(null);
      navigation.navigate('DiaryEntry', { date: day.toISOString() });
    }
  }

  const selectedDayEntries = selectedDayKey
    ? entriesByDate.get(selectedDayKey) ?? []
    : [];

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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="前の月"
        >
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navButton}
          accessibilityRole="button"
          accessibilityLabel="次の月"
        >
          <Text style={styles.navButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, i) => (
          <View key={day} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                i === 0 && { color: colors.sunday },
                i === 6 && { color: colors.saturday },
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (!day) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const key = format(day, 'yyyy-MM-dd');
          const dayEntries = entriesByDate.get(key);
          const hasEntry = dayEntries && dayEntries.length > 0;
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDayKey === key;
          const dayOfWeek = getDay(day);

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                isSelected && !isToday && styles.selectedCell,
              ]}
              onPress={() => handleDayPress(day)}
              accessibilityRole="button"
              accessibilityLabel={
                hasEntry
                  ? `${format(day, 'M月d日')} 日記${dayEntries.length}件`
                  : `${format(day, 'M月d日')} 日記を追加`
              }
            >
              <Text
                style={[
                  styles.dayText,
                  dayOfWeek === 0 && { color: colors.sunday },
                  dayOfWeek === 6 && { color: colors.saturday },
                  isToday && styles.todayText,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {hasEntry && (
                <View style={styles.moodRow}>
                  <Text style={styles.moodIndicator}>
                    {moodEmojis[dayEntries[0].mood]}
                  </Text>
                  {dayEntries.length > 1 && (
                    <Text style={styles.moodCountBadge}>
                      +{dayEntries.length - 1}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDayKey && selectedDayEntries.length > 0 ? (
        <View style={styles.dayPanel}>
          <Text style={styles.dayPanelTitle}>
            {format(new Date(selectedDayKey), 'M月d日(E)', { locale: ja })}の日記
          </Text>
          {selectedDayEntries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.dayPanelRow}
              onPress={() => navigation.navigate('DiaryEntry', { id: entry.id })}
              accessibilityRole="button"
              accessibilityLabel={`${entry.title} を開く`}
            >
              <Text style={styles.dayPanelMood}>{moodEmojis[entry.mood]}</Text>
              <Text style={styles.dayPanelText} numberOfLines={1}>
                {entry.title}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.dayPanelAdd}
            onPress={() =>
              navigation.navigate('DiaryEntry', {
                date: new Date(selectedDayKey).toISOString(),
              })
            }
            accessibilityRole="button"
            accessibilityLabel="この日に日記を追加"
          >
            <Text style={styles.dayPanelAddText}>＋ この日に日記を追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.legend}>
          <Text style={styles.legendText}>
            日付をタップして日記を見る・書く
          </Text>
        </View>
      )}
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
    },
    navButton: {
      padding: spacing.sm,
    },
    navButtonText: {
      fontSize: 18,
      color: colors.primary,
    },
    monthTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    weekdayRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.sm,
    },
    weekdayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    weekdayText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.textSecondary,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.sm,
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xs,
    },
    todayCell: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
    },
    selectedCell: {
      backgroundColor: colors.backgroundMuted,
      borderRadius: borderRadius.md,
    },
    dayText: {
      fontSize: 14,
      color: colors.text,
    },
    todayText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    moodIndicator: {
      fontSize: 12,
    },
    moodCountBadge: {
      fontSize: 9,
      fontWeight: 'bold',
      color: colors.primary,
      marginLeft: 1,
    },
    legend: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    legendText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    dayPanel: {
      margin: spacing.lg,
      padding: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
    },
    dayPanelTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.md,
    },
    dayPanelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.backgroundMuted,
    },
    dayPanelMood: {
      fontSize: 20,
      marginRight: spacing.md,
    },
    dayPanelText: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    dayPanelAdd: {
      marginTop: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    dayPanelAddText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
