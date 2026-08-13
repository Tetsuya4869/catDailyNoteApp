import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Cat, catColorEmojis } from '../types';
import { getRepository } from '../repositories';
import { useCats } from '../contexts/CatContext';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../navigation/types';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const repository = getRepository();

export default function CatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cats, selectedCatId, setSelectedCatId, refreshCats } = useCats();
  useFocusEffect(useCallback(() => { refreshCats(); }, [refreshCats]));

  function handleArchive(cat: Cat) {
    Alert.alert('猫をアーカイブ', `${cat.name}を一覧から非表示にしますか？\n日記・健康記録・写真は削除されません。`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'アーカイブ', style: 'destructive', onPress: async () => { if (selectedCatId === cat.id) setSelectedCatId(null); await repository.archiveCat(cat.id); await refreshCats(); } },
    ]);
  }

  return <View style={styles.container}>{cats.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>🐱</Text><Text style={styles.emptyText}>猫を登録しましょう</Text><Text style={styles.muted}>右下のボタンから追加</Text></View> : <><Text style={styles.hint}>タップでプロフィール・長押しでアーカイブ</Text><FlatList data={cats} numColumns={2} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('CatProfile', { catId: item.id })} onLongPress={() => handleArchive(item)}>{item.photoUri ? <Image source={{ uri: item.photoUri }} style={styles.photo} /> : <View style={styles.placeholder}><Text style={styles.placeholderEmoji}>{catColorEmojis[item.color]}</Text></View>}<View style={styles.info}><Text style={styles.name}>{item.name}</Text><Text>{catColorEmojis[item.color]}</Text></View></TouchableOpacity>} /></>}<TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CatEdit', {})}><Text style={styles.fabText}>＋</Text></TouchableOpacity></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, hint: { textAlign: 'center', color: colors.textMuted, fontSize: 12, padding: spacing.md }, list: { padding: spacing.sm, paddingBottom: 90 }, card: { flex: 1, margin: spacing.sm, backgroundColor: colors.card, borderRadius: borderRadius.lg, overflow: 'hidden' }, photo: { width: '100%', aspectRatio: 1 }, placeholder: { width: '100%', aspectRatio: 1, backgroundColor: colors.backgroundMuted, alignItems: 'center', justifyContent: 'center' }, placeholderEmoji: { fontSize: 48 }, info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md }, name: { color: colors.text, fontSize: 16, fontWeight: 'bold' }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center' }, emptyEmoji: { fontSize: 64, marginBottom: spacing.md }, emptyText: { color: colors.text, fontSize: 18, marginBottom: spacing.sm }, muted: { color: colors.textMuted }, fab: { position: 'absolute', right: spacing.xl, bottom: spacing.xl, width: 60, height: 60, borderRadius: borderRadius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, fabText: { color: '#fff', fontSize: 30 } });
