import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  DiaryEntry,
  HealthRecord,
  catColorEmojis,
  catGenderSymbols,
  moodEmojis,
  healthTypeEmojis,
  healthTypeLabels,
} from '../types';
import { getDiaryEntries } from '../storage/diaryStorage';
import {
  getHealthRecordsByCat,
  getWeightSeries,
} from '../storage/healthStorage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCatAge } from '../utils/age';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Segment = 'diary' | 'health' | 'album';

const segments: { key: Segment; label: string; emoji: string }[] = [
  { key: 'diary', label: '日記', emoji: '📖' },
  { key: 'health', label: '健康', emoji: '🏥' },
  { key: 'album', label: 'アルバム', emoji: '🖼' },
];

const screenWidth = Dimensions.get('window').width;
const albumGap = spacing.sm;
const albumCols = 3;

export default function CatProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CatProfile'>>();
  const { catId } = route.params;
  const { cats } = useCats();
  const cat = cats.find((c) => c.id === catId);

  const [segment, setSegment] = useState<Segment>('diary');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [weights, setWeights] = useState<{ date: string; weightKg: number }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setError(null);
      const [all, healthRecords, weightSeries] = await Promise.all([
        getDiaryEntries(user.id),
        getHealthRecordsByCat(catId, user.id),
        getWeightSeries(catId, user.id),
      ]);
      setEntries(
        all
          .filter((e) => e.catId === catId)
          .sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          )
      );
      setHealth(healthRecords);
      setWeights(weightSeries);
    } catch (err) {
      console.error('Failed to load cat profile data:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [catId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      loadData().then(() => {
        if (!active) return;
      });
      return () => {
        active = false;
      };
    }, [loadData])
  );

  if (!cat) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>猫が見つかりませんでした</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.missing}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.missing}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const age = formatCatAge(cat.birthDate);
  const photoEntries = entries.filter((e) => e.photoUri);
  const albumCellSize =
    (screenWidth - spacing.xl * 2 - albumGap * (albumCols - 1)) / albumCols;

  function renderHeader() {
    if (!cat) return null;
    return (
      <View style={styles.header}>
        <View style={styles.headerGradient} />
        <View style={styles.avatarWrap}>
          {cat.photoUri ? (
            <Image source={{ uri: cat.photoUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarEmoji}>
                {catColorEmojis[cat.color]}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{cat.name}</Text>
        <Text style={styles.meta}>
          {cat.gender ? catGenderSymbols[cat.gender] : ''}
          {cat.gender && age ? ' ・ ' : ''}
          {age ?? ''}
        </Text>
        <TouchableOpacity
          style={styles.editLink}
          onPress={() => navigation.navigate('CatEdit', { id: cat.id })}
          accessibilityRole="button"
          accessibilityLabel="基本情報を編集"
        >
          <Text style={styles.editLinkText}>基本情報を編集</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSegmentControl() {
    return (
      <View style={styles.segmentControl}>
        {segments.map((s) => {
          const active = segment === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={s.label}
            >
              <Text
                style={[
                  styles.segmentText,
                  active && styles.segmentTextActive,
                ]}
              >
                {s.emoji} {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderDiary() {
    if (entries.length === 0) {
      return (
        <EmptyState
          styles={styles}
          emoji="📖"
          text="この子の日記はまだありません"
        />
      );
    }
    return (
      <View style={styles.section}>
        {entries.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.diaryRow}
            onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}
          >
            {item.photoUri && (
              <Image source={{ uri: item.photoUri }} style={styles.diaryThumb} />
            )}
            <View style={styles.diaryBody}>
              <Text style={styles.diaryDate}>
                {format(new Date(item.date), 'M月d日(E)', { locale: ja })}
              </Text>
              <Text style={styles.diaryTitle} numberOfLines={1}>
                {moodEmojis[item.mood]} {item.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderWeightChart() {
    if (weights.length === 0) return null;
    const values = weights.map((w) => w.weightKg);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>⚖️ 体重の推移</Text>
        <View style={styles.chart}>
          {weights.map((w, i) => {
            const ratio = (w.weightKg - min) / range;
            const height = 24 + ratio * 96; // 24〜120px
            return (
              <View key={i} style={styles.chartCol}>
                <Text style={styles.chartValue}>{w.weightKg}</Text>
                <View style={[styles.chartBar, { height }]} />
                <Text style={styles.chartLabel}>
                  {format(new Date(w.date), 'M/d')}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  function renderHealth() {
    if (health.length === 0) {
      return (
        <EmptyState
          styles={styles}
          emoji="🏥"
          text="健康記録はまだありません"
          sub="体重・通院・ワクチン・投薬を記録できます"
        />
      );
    }
    return (
      <View style={styles.section}>
        {renderWeightChart()}
        {health.map((r) => (
          <View key={r.id} style={styles.healthRow}>
            <Text style={styles.healthEmoji}>{healthTypeEmojis[r.type]}</Text>
            <View style={styles.healthBody}>
              <Text style={styles.healthTitle}>
                {r.title || healthTypeLabels[r.type]}
                {r.type === 'weight' && r.weightKg != null
                  ? ` ${r.weightKg}kg`
                  : ''}
              </Text>
              <Text style={styles.healthDate}>
                {format(new Date(r.date), 'yyyy年M月d日', { locale: ja })}
              </Text>
              {!!r.note && <Text style={styles.healthNote}>{r.note}</Text>}
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderAlbum() {
    if (photoEntries.length === 0) {
      return (
        <EmptyState
          styles={styles}
          emoji="🖼"
          text="写真付きの日記がまだありません"
        />
      );
    }
    return (
      <FlatList
        data={photoEntries}
        keyExtractor={(item) => item.id}
        numColumns={albumCols}
        scrollEnabled={false}
        columnWrapperStyle={styles.albumRow}
        contentContainerStyle={styles.albumGrid}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}
          >
            <Image
              source={{ uri: item.photoUri }}
              style={{
                width: albumCellSize,
                height: albumCellSize,
                borderRadius: borderRadius.md,
              }}
            />
          </TouchableOpacity>
        )}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderHeader()}
        {renderSegmentControl()}
        {segment === 'diary' && renderDiary()}
        {segment === 'health' && renderHealth()}
        {segment === 'album' && renderAlbum()}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('DiaryEntry', { catId: cat.id })}
        accessibilityRole="button"
        accessibilityLabel={`${cat.name}の日記を書く`}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({
  styles,
  emoji,
  text,
  sub,
}: {
  styles: ReturnType<typeof createStyles>;
  emoji: string;
  text: string;
  sub?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {!!sub && <Text style={styles.emptySub}>{sub}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    missing: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    missingText: {
      fontSize: 16,
      color: colors.textSecondary,
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
      alignItems: 'center',
      paddingBottom: spacing.lg,
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 110,
      backgroundColor: colors.peach,
    },
    avatarWrap: {
      marginTop: spacing.xxl,
      padding: 4,
      backgroundColor: colors.background,
      borderRadius: borderRadius.full,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    avatarPlaceholder: {
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarEmoji: {
      fontSize: 44,
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: spacing.sm,
    },
    meta: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    editLink: {
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.full,
      backgroundColor: colors.backgroundMuted,
    },
    editLinkText: {
      fontSize: 12,
      color: colors.brown,
      fontWeight: 'bold',
    },
    segmentControl: {
      flexDirection: 'row',
      marginHorizontal: spacing.xl,
      marginVertical: spacing.lg,
      backgroundColor: colors.backgroundMuted,
      borderRadius: borderRadius.full,
      padding: 4,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: 'bold',
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
    section: {
      paddingHorizontal: spacing.xl,
    },
    diaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    diaryThumb: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      marginRight: spacing.md,
    },
    diaryBody: {
      flex: 1,
    },
    diaryDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    diaryTitle: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
      marginTop: 2,
    },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.md,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      minHeight: 150,
    },
    chartCol: {
      alignItems: 'center',
      flex: 1,
    },
    chartValue: {
      fontSize: 10,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    chartBar: {
      width: 16,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.sm,
    },
    chartLabel: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    healthRow: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    healthEmoji: {
      fontSize: 24,
      marginRight: spacing.md,
    },
    healthBody: {
      flex: 1,
    },
    healthTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    healthDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    healthNote: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    albumGrid: {
      paddingHorizontal: spacing.xl,
    },
    albumRow: {
      gap: albumGap,
      marginBottom: albumGap,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xxl * 2,
    },
    emptyEmoji: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    emptySub: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.xs,
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
