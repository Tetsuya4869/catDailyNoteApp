import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  CatMood,
  DiaryEntry,
  PostCategory,
  moodEmojis,
  moodLabels,
  catColorEmojis,
  postCategoryEmojis,
  postCategoryLabels,
} from '../types';
import {
  saveDiaryEntry,
  getDiaryEntryById,
  deleteDiaryEntry,
} from '../storage/diaryStorage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useCats } from '../contexts/CatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { resizeImage } from '../utils/image';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DiaryEntry'>;
  route: RouteProp<RootStackParamList, 'DiaryEntry'>;
};

const moods: CatMood[] = ['happy', 'sleepy', 'playful', 'hungry', 'relaxed'];
const categories: PostCategory[] = [
  'meal',
  'play',
  'sleep',
  'health',
  'grooming',
  'other',
];

export default function DiaryEntryScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { cats, selectedCatId } = useCats();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const editId = route.params?.id;
  const presetCatId = route.params?.catId;
  const presetDate = route.params?.date;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<CatMood>('happy');
  const [catId, setCatId] = useState<string | undefined>(
    presetCatId || selectedCatId || undefined
  );
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [category, setCategory] = useState<PostCategory | undefined>();
  const [date, setDate] = useState(() =>
    presetDate ? new Date(presetDate) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [loadError, setLoadError] = useState(false);

  // 未保存変更の検知用。保存/削除完了後は破棄確認をスキップする。
  const initialSnapshot = useRef<string>('');
  const skipDiscardGuard = useRef(false);

  const serialize = useCallback(
    () =>
      JSON.stringify({
        title,
        content,
        mood,
        catId,
        photoUri,
        category,
        date: date.toISOString(),
      }),
    [title, content, mood, catId, photoUri, category, date]
  );

  useEffect(() => {
    if (editId) {
      loadEntry();
    } else {
      // 新規作成: 初期状態をスナップショットとして記録
      initialSnapshot.current = JSON.stringify({
        title: '',
        content: '',
        mood: 'happy',
        catId: presetCatId || selectedCatId || undefined,
        photoUri: undefined,
        category: undefined,
        date: date.toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function loadEntry() {
    if (!editId) return;
    try {
      setLoadError(false);
      const entry = await getDiaryEntryById(editId);
      if (!entry) {
        setLoadError(true);
        return;
      }
      setTitle(entry.title);
      setContent(entry.content);
      setMood(entry.mood);
      setCatId(entry.catId);
      setPhotoUri(entry.photoUri);
      setCategory(entry.category);
      setDate(new Date(entry.date));
      setCreatedAt(entry.createdAt);
      initialSnapshot.current = JSON.stringify({
        title: entry.title,
        content: entry.content,
        mood: entry.mood,
        catId: entry.catId,
        photoUri: entry.photoUri,
        category: entry.category,
        date: new Date(entry.date).toISOString(),
      });
    } catch (err) {
      console.error('Failed to load diary entry:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // 未保存の変更がある状態で画面を離れようとしたら確認する
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const isDirty = serialize() !== initialSnapshot.current;
      if (!isDirty || skipDiscardGuard.current || loadError) return;
      e.preventDefault();
      Alert.alert('変更を破棄しますか？', '編集中の内容は保存されません', [
        { text: '編集を続ける', style: 'cancel' },
        {
          text: '破棄',
          style: 'destructive',
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, serialize, loadError]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const resized = await resizeImage(result.assets[0].uri);
      setPhotoUri(resized);
    }
  }

  function removePhoto() {
    Alert.alert('写真を削除', '写真を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => setPhotoUri(undefined) },
    ]);
  }

  function handleDateChange(_event: unknown, selectedDate?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    setError(null);

    try {
      const entry: DiaryEntry = {
        id: editId || Date.now().toString(),
        catId,
        date: date.toISOString(),
        title: title.trim(),
        content: content.trim(),
        mood,
        photoUri,
        category,
        createdAt: createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveDiaryEntry(entry, user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      skipDiscardGuard.current = true;
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save diary entry:', err);
      setError('保存に失敗しました');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editId || !user?.id) return;
    const userId = user.id;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('削除確認', 'この日記を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          // 元に戻せるよう削除前のスナップショットを保持
          const snapshot: DiaryEntry = {
            id: editId,
            catId,
            date: date.toISOString(),
            title: title.trim() || '無題',
            content: content.trim(),
            mood,
            photoUri,
            category,
            createdAt: createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await deleteDiaryEntry(editId, userId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          skipDiscardGuard.current = true;
          navigation.goBack();
          showSnackbar({
            message: '日記を削除しました',
            actionLabel: '元に戻す',
            onAction: async () => {
              try {
                await saveDiaryEntry(snapshot, userId);
              } catch (err) {
                console.error('Failed to undo delete:', err);
              }
            },
          });
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadErrorEmoji}>😿</Text>
        <Text style={styles.loadErrorText}>日記を読み込めませんでした</Text>
        <TouchableOpacity
          style={styles.loadErrorButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="前の画面に戻る"
        >
          <Text style={styles.loadErrorButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonLabel}>📅 日付</Text>
          <Text style={styles.dateButtonValue}>
            {format(date, 'yyyy年M月d日(E)', { locale: ja })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={pickImage}>
                <Text style={styles.photoActionText}>📷 変更</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={removePhoto}>
                <Text style={[styles.photoActionText, styles.photoRemoveText]}>
                  ✕ 削除
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoPlaceholder}
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="写真を追加"
          >
            <Text style={styles.photoPlaceholderEmoji}>📷</Text>
            <Text style={styles.photoPlaceholderText}>写真を追加</Text>
          </TouchableOpacity>
        )}

        {cats.length > 0 && (
          <>
            <Text style={styles.label}>どの猫？</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScrollView}
              contentContainerStyle={styles.catContainer}
            >
              <TouchableOpacity
                style={[styles.catButton, !catId && styles.catButtonActive]}
                onPress={() => setCatId(undefined)}
              >
                <Text style={styles.catEmoji}>🐱</Text>
                <Text style={[styles.catLabel, !catId && styles.catLabelActive]}>
                  指定なし
                </Text>
              </TouchableOpacity>
              {cats.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catButton, catId === cat.id && styles.catButtonActive]}
                  onPress={() => setCatId(cat.id)}
                >
                  <Text style={styles.catEmoji}>{catColorEmojis[cat.color]}</Text>
                  <Text
                    style={[styles.catLabel, catId === cat.id && styles.catLabelActive]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>今日の気分</Text>
        <View style={styles.moodContainer}>
          {moods.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodButton, mood === m && styles.moodButtonActive]}
              onPress={() => setMood(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: mood === m }}
              accessibilityLabel={`気分: ${moodLabels[m]}`}
            >
              <Text style={styles.moodEmoji}>{moodEmojis[m]}</Text>
              <Text
                style={[styles.moodLabel, mood === m && styles.moodLabelActive]}
              >
                {moodLabels[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>カテゴリ（任意）</Text>
        <View style={styles.categoryContainer}>
          {categories.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.categoryButton,
                  active && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(active ? undefined : c)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`カテゴリ: ${postCategoryLabels[c]}`}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {postCategoryEmojis[c]} {postCategoryLabels[c]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>タイトル</Text>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="今日のできごと"
          placeholderTextColor={colors.textPlaceholder}
        />

        <Text style={styles.label}>日記</Text>
        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder="今日はどんな一日だった？"
          placeholderTextColor={colors.textPlaceholder}
          multiline
          textAlignVertical="top"
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {editId && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="この日記を削除"
          >
            <Text style={styles.deleteButtonText}>🗑 この日記を削除</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="日記を保存する"
        accessibilityState={{ disabled: saving }}
      >
        <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存する'}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: spacing.xl,
    },
    loadErrorEmoji: {
      fontSize: 56,
      marginBottom: spacing.lg,
    },
    loadErrorText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    loadErrorButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxl,
      borderRadius: borderRadius.md,
    },
    loadErrorButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: spacing.xl,
    },
    dateButton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.xl,
    },
    dateButtonLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    dateButtonValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    photoContainer: {
      marginBottom: spacing.xxl,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    photo: {
      width: '100%',
      height: 200,
    },
    photoActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
      padding: spacing.sm,
    },
    photoActionBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    photoActionText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: 'bold',
    },
    photoRemoveText: {
      color: colors.danger,
    },
    photoPlaceholder: {
      width: '100%',
      height: 200,
      backgroundColor: colors.backgroundMuted,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      marginBottom: spacing.xxl,
    },
    photoPlaceholderEmoji: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    photoPlaceholderText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    catScrollView: {
      marginBottom: spacing.xxl,
      marginHorizontal: -spacing.xl,
    },
    catContainer: {
      paddingHorizontal: spacing.xl,
      gap: spacing.sm,
    },
    catButton: {
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.card,
      minWidth: 70,
    },
    catButtonActive: {
      backgroundColor: colors.primary,
    },
    catEmoji: {
      fontSize: 24,
      marginBottom: spacing.xs,
    },
    catLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    catLabelActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    moodContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xxl,
    },
    moodButton: {
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.card,
      minWidth: 60,
    },
    moodButtonActive: {
      backgroundColor: colors.primary,
    },
    moodEmoji: {
      fontSize: 28,
      marginBottom: spacing.xs,
    },
    moodLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    moodLabelActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    categoryButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.full,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryButtonActive: {
      backgroundColor: colors.brown,
      borderColor: colors.brown,
    },
    categoryText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    categoryTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    titleInput: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.xxl,
    },
    contentInput: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: 16,
      color: colors.text,
      minHeight: 150,
      marginBottom: spacing.xxl,
    },
    deleteButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.danger,
      padding: 14,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    deleteButtonText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: 'bold',
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    saveButton: {
      backgroundColor: colors.primary,
      margin: spacing.xl,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
