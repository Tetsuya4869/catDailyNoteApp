import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
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

  const loadEntries = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!user?.id) return;
      const data = await getDiaryEntries(user.id);
      if (!isActive()) return;
      setEntries(data);
      setLoading(false);
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

  function goToPreviousMonth() {
    setCurrentMonth((m) => subMonths(m, 1));
  }

  function goToNextMonth() {
    setCurrentMonth((m) => addMonths(m, 1));
  }

  function handleDayPress(day: Date) {
    const key = format(day, 'yyyy-MM-dd');
    const dayEntries = entriesByDate.get(key);
    if (dayEntries && dayEntries.length > 0) {
      navigation.navigate('DiaryEntry', { id: dayEntries[0].id });
    } else {
      navigation.navigate('DiaryEntry', {});
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
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
          const dayOfWeek = getDay(day);

          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayCell, isToday && styles.todayCell]}
              onPress={() => handleDayPress(day)}
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
                <Text style={styles.moodIndicator}>
                  {moodEmojis[dayEntries[0].mood]}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          日付をタップして日記を見る・書く
        </Text>
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
    dayText: {
      fontSize: 14,
      color: colors.text,
    },
    todayText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    moodIndicator: {
      fontSize: 12,
      marginTop: 2,
    },
    legend: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    legendText: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
