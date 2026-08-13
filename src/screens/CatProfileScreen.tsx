import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList, Dimensions } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, HealthRecord, Appointment, catColorEmojis, catGenderSymbols, moodEmojis, healthTypeEmojis, healthTypeLabels } from '../types';
import { getDiaryEntries } from '../storage/diaryStorage';
import { getHealthRecordsByCat, getWeightSeries, getAppointmentsByCat, saveAppointment } from '../storage/healthStorage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { formatCatAge } from '../utils/age';
import { dateOnlyToLocalDate, todayDateOnly } from '../utils/date';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Segment = 'diary' | 'health' | 'album';
const screenWidth = Dimensions.get('window').width;
const albumCols = 3;
const albumGap = spacing.sm;

export default function CatProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'CatProfile'>>();
  const { catId } = route.params;
  const { cats } = useCats();
  const cat = cats.find((item) => item.id === catId);
  const [segment, setSegment] = useState<Segment>('diary');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [weights, setWeights] = useState<{ date: string; weightKg: number }[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getDiaryEntries(), getHealthRecordsByCat(catId), getWeightSeries(catId), getAppointmentsByCat(catId)]).then(([all, healthRecords, weightSeries, appointmentItems]) => {
      if (!active) return;
      setEntries(all.filter((entry) => entry.catId === catId).sort((a, b) => b.date.localeCompare(a.date)));
      setHealth(healthRecords);
      setWeights(weightSeries);
      setAppointments(appointmentItems);
    });
    return () => { active = false; };
  }, [catId]));

  if (!cat) return <View style={styles.missing}><Text style={styles.missingText}>猫が見つかりませんでした</Text></View>;

  const photoEntries = entries.filter((entry) => entry.photoUri);
  const albumCell = (screenWidth - spacing.xl * 2 - albumGap * (albumCols - 1)) / albumCols;

  async function toggleAppointment(item: Appointment) {
    await saveAppointment({ ...item, done: !item.done });
    setAppointments((prev) => prev.map((a) => a.id === item.id ? { ...a, done: !a.done } : a));
  }

  function Header() {
    return <>
      <View style={styles.header}>
        <View style={styles.headerBand} />
        <View style={styles.avatarWrap}>{cat.photoUri ? <Image source={{ uri: cat.photoUri }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarPlaceholder]}><Text style={styles.avatarEmoji}>{catColorEmojis[cat.color]}</Text></View>}</View>
        <Text style={styles.name}>{cat.name}</Text>
        <Text style={styles.meta}>{cat.gender ? catGenderSymbols[cat.gender] : ''}{cat.gender && formatCatAge(cat.birthDate) ? ' ・ ' : ''}{formatCatAge(cat.birthDate) ?? ''}</Text>
        <TouchableOpacity style={styles.editLink} onPress={() => navigation.navigate('CatEdit', { id: cat.id })}><Text style={styles.editText}>基本情報を編集</Text></TouchableOpacity>
      </View>
      <View style={styles.segmentControl}>{(['diary', 'health', 'album'] as Segment[]).map((key) => <TouchableOpacity key={key} style={[styles.segment, segment === key && styles.segmentActive]} onPress={() => setSegment(key)}><Text style={[styles.segmentText, segment === key && styles.segmentTextActive]}>{key === 'diary' ? '📖 日記' : key === 'health' ? '🏥 健康' : '🖼 アルバム'}</Text></TouchableOpacity>)}</View>
    </>;
  }

  function DiarySection() {
    if (entries.length === 0) return <Empty styles={styles} emoji="📖" text="この子の日記はまだありません" />;
    return <View style={styles.section}>{entries.map((item) => <TouchableOpacity key={item.id} style={styles.diaryRow} onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}>{item.photoUri && <Image source={{ uri: item.photoUri }} style={styles.thumb} />}<View style={{ flex: 1 }}><Text style={styles.small}>{format(dateOnlyToLocalDate(item.date), 'M月d日(E)', { locale: ja })}</Text><Text style={styles.diaryTitle}>{moodEmojis[item.mood]} {item.title}</Text></View></TouchableOpacity>)}</View>;
  }

  function WeightChart() {
    if (weights.length === 0) return null;
    const values = weights.map((w) => w.weightKg);
    const max = Math.max(...values); const min = Math.min(...values); const range = max - min || 1;
    return <View style={styles.chartCard}><Text style={styles.cardTitle}>⚖️ 体重の推移</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chart}>{weights.map((w, index) => <View key={`${w.date}-${index}`} style={styles.chartCol}><Text style={styles.chartValue}>{w.weightKg}</Text><View style={[styles.chartBar, { height: 24 + ((w.weightKg - min) / range) * 96 }]} /><Text style={styles.small}>{format(dateOnlyToLocalDate(w.date), 'M/d')}</Text></View>)}</ScrollView></View>;
  }

  function HealthSection() {
    const upcoming = appointments.filter((item) => !item.done && item.date >= todayDateOnly());
    return <View style={styles.section}>
      <View style={styles.actionRow}><TouchableOpacity style={styles.action} onPress={() => navigation.navigate('HealthRecordEdit', { catId })}><Text style={styles.actionText}>＋ 健康記録</Text></TouchableOpacity><TouchableOpacity style={styles.actionSecondary} onPress={() => navigation.navigate('AppointmentEdit', { catId })}><Text style={styles.actionSecondaryText}>＋ 予定</Text></TouchableOpacity></View>
      {upcoming.length > 0 && <View style={styles.card}><Text style={styles.cardTitle}>📅 今後の予定</Text>{upcoming.map((item) => <TouchableOpacity key={item.id} style={styles.appointmentRow} onPress={() => navigation.navigate('AppointmentEdit', { catId, id: item.id })} onLongPress={() => toggleAppointment(item)}><Text style={styles.healthEmoji}>{item.type === 'vet' ? '🏥' : '💉'}</Text><View style={{ flex: 1 }}><Text style={styles.diaryTitle}>{item.title}</Text><Text style={styles.small}>{item.date} ・ 長押しで完了</Text></View></TouchableOpacity>)}</View>}
      <WeightChart />
      {health.length === 0 ? <Empty styles={styles} emoji="🏥" text="健康記録はまだありません" /> : health.map((item) => <View key={item.id} style={styles.healthRow}><Text style={styles.healthEmoji}>{healthTypeEmojis[item.type]}</Text><View style={{ flex: 1 }}><Text style={styles.diaryTitle}>{item.title || healthTypeLabels[item.type]}{item.type === 'weight' && item.weightKg != null ? ` ${item.weightKg}kg` : ''}</Text><Text style={styles.small}>{item.date}</Text>{!!item.note && <Text style={styles.note}>{item.note}</Text>}</View></View>)}
    </View>;
  }

  function AlbumSection() {
    if (photoEntries.length === 0) return <Empty styles={styles} emoji="🖼" text="写真付きの日記がまだありません" />;
    return <FlatList data={photoEntries} keyExtractor={(item) => item.id} numColumns={albumCols} scrollEnabled={false} columnWrapperStyle={{ gap: albumGap }} contentContainerStyle={styles.albumGrid} renderItem={({ item }) => <TouchableOpacity onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}><Image source={{ uri: item.photoUri }} style={{ width: albumCell, height: albumCell, borderRadius: borderRadius.md, marginBottom: albumGap }} /></TouchableOpacity>} />;
  }

  return <View style={styles.container}><ScrollView contentContainerStyle={{ paddingBottom: 100 }}><Header />{segment === 'diary' ? <DiarySection /> : segment === 'health' ? <HealthSection /> : <AlbumSection />}</ScrollView><TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('DiaryEntry', { catId: cat.id })}><Text style={styles.fabText}>＋</Text></TouchableOpacity></View>;
}

function Empty({ styles, emoji, text }: { styles: ReturnType<typeof createStyles>; emoji: string; text: string }) { return <View style={styles.empty}><Text style={styles.emptyEmoji}>{emoji}</Text><Text style={styles.missingText}>{text}</Text></View>; }

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  missing: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  missingText: { color: colors.textSecondary },
  header: { alignItems: 'center', paddingBottom: spacing.lg },
  headerBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 110, backgroundColor: colors.peach },
  avatarWrap: { marginTop: spacing.xxl, padding: 4, backgroundColor: colors.background, borderRadius: borderRadius.full },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 44 },
  name: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.sm },
  meta: { color: colors.textSecondary, marginTop: spacing.xs },
  editLink: { marginTop: spacing.md, backgroundColor: colors.backgroundMuted, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  editText: { color: colors.brown, fontWeight: 'bold', fontSize: 12 },
  segmentControl: { flexDirection: 'row', margin: spacing.xl, marginTop: spacing.sm, backgroundColor: colors.backgroundMuted, borderRadius: borderRadius.full, padding: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.full },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontWeight: 'bold', fontSize: 13 },
  segmentTextActive: { color: '#fff' },
  section: { paddingHorizontal: spacing.xl },
  diaryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, gap: spacing.md },
  thumb: { width: 52, height: 52, borderRadius: borderRadius.md },
  small: { color: colors.textMuted, fontSize: 11 },
  diaryTitle: { color: colors.text, fontWeight: '600', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  action: { flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold' },
  actionSecondary: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  actionSecondaryText: { color: colors.primary, fontWeight: 'bold' },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  cardTitle: { color: colors.text, fontWeight: 'bold', marginBottom: spacing.md },
  appointmentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  healthRow: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md },
  healthEmoji: { fontSize: 24 },
  note: { color: colors.textSecondary, marginTop: spacing.xs },
  chartCard: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  chart: { minHeight: 150, alignItems: 'flex-end', gap: spacing.md, paddingRight: spacing.md },
  chartCol: { width: 42, alignItems: 'center', justifyContent: 'flex-end' },
  chartValue: { color: colors.textSecondary, fontSize: 10, marginBottom: 4 },
  chartBar: { width: 16, backgroundColor: colors.primary, borderRadius: borderRadius.sm, marginBottom: 4 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  albumGrid: { paddingHorizontal: spacing.xl },
  fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xl, width: 60, height: 60, borderRadius: borderRadius.full, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 30 },
});
