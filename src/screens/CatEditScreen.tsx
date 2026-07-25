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
import * as Haptics from '../utils/haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Cat,
  CatColor,
  CatGender,
  catColorEmojis,
  catColorLabels,
  catGenderSymbols,
} from '../types';
import { saveCat, getCatById, deleteCat } from '../storage/catStorage';
import { useCats } from '../contexts/CatContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import { resizeImage } from '../utils/image';
import { RootStackParamList } from '../navigation/types';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CatEdit'>;
  route: RouteProp<RootStackParamList, 'CatEdit'>;
};

const catColors: CatColor[] = ['orange', 'black', 'white', 'gray', 'calico', 'tabby'];
const genders: CatGender[] = ['male', 'female', 'unknown'];
const genderLabels: Record<CatGender, string> = {
  male: 'オス',
  female: 'メス',
  unknown: '不明',
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function CatEditScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refreshCats, selectedCatId, setSelectedCatId } = useCats();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const editId = route.params?.id;
  const [name, setName] = useState('');
  const [color, setColor] = useState<CatColor>('orange');
  const [gender, setGender] = useState<CatGender>('unknown');
  const [birthDate, setBirthDate] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!editId);
  const [loadError, setLoadError] = useState(false);

  // 未保存変更の検知用。保存/削除完了後は破棄確認をスキップする。
  const initialSnapshot = useRef<string>('');
  const skipDiscardGuard = useRef(false);

  const serialize = useCallback(
    () => JSON.stringify({ name, color, gender, birthDate, photoUri }),
    [name, color, gender, birthDate, photoUri]
  );

  useEffect(() => {
    if (editId) {
      loadCat();
    } else {
      initialSnapshot.current = JSON.stringify({
        name: '',
        color: 'orange',
        gender: 'unknown',
        birthDate: undefined,
        photoUri: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function loadCat() {
    if (!editId) return;
    try {
      setLoadError(false);
      const cat = await getCatById(editId);
      if (!cat) {
        setLoadError(true);
        return;
      }
      setName(cat.name);
      setColor(cat.color);
      setGender(cat.gender ?? 'unknown');
      setBirthDate(cat.birthDate);
      setPhotoUri(cat.photoUri);
      initialSnapshot.current = JSON.stringify({
        name: cat.name,
        color: cat.color,
        gender: cat.gender ?? 'unknown',
        birthDate: cat.birthDate,
        photoUri: cat.photoUri,
      });
    } catch (err) {
      console.error('Failed to load cat:', err);
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

  function handleDelete() {
    if (!editId || !user?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      '削除確認',
      `${name || 'この猫'}を削除しますか？\n（関連する日記は残ります）`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 元に戻せるよう削除前の完全なデータを取得
              const snapshot = await getCatById(editId);
              if (selectedCatId === editId) {
                setSelectedCatId(null);
              }
              await deleteCat(editId, user.id);
              await refreshCats();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              skipDiscardGuard.current = true;
              navigation.goBack();
              if (snapshot) {
                showSnackbar({
                  message: `${snapshot.name}を削除しました`,
                  actionLabel: '元に戻す',
                  onAction: async () => {
                    try {
                      await saveCat(snapshot, user.id);
                      await refreshCats();
                    } catch (err) {
                      console.error('Failed to undo cat delete:', err);
                    }
                  },
                });
              }
            } catch (err) {
              console.error('Failed to delete cat:', err);
              Alert.alert('エラー', '削除に失敗しました');
            }
          },
        },
      ]
    );
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const resized = await resizeImage(result.assets[0].uri);
      setPhotoUri(resized);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '名前を入力してください');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    setError(null);

    try {
      const cat: Cat = {
        id: editId || Date.now().toString(),
        name: name.trim(),
        color,
        gender,
        birthDate,
        photoUri,
        createdAt: editId ? '' : new Date().toISOString(),
      };

      if (editId) {
        const existing = await getCatById(editId);
        if (existing) {
          cat.createdAt = existing.createdAt;
        }
      }

      await saveCat(cat, user.id);
      await refreshCats();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      skipDiscardGuard.current = true;
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save cat:', err);
      setError('保存に失敗しました');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
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
        <Text style={styles.loadErrorText}>猫の情報を読み込めませんでした</Text>
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
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderEmoji}>📷</Text>
              <Text style={styles.photoPlaceholderText}>写真を追加</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>名前</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="ミケ、タマなど"
          placeholderTextColor={colors.textPlaceholder}
        />

        <Text style={styles.label}>毛色</Text>
        <View style={styles.colorContainer}>
          {catColors.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorButton, color === c && styles.colorButtonActive]}
              onPress={() => setColor(c)}
            >
              <Text style={styles.colorEmoji}>{catColorEmojis[c]}</Text>
              <Text
                style={[
                  styles.colorLabel,
                  color === c && styles.colorLabelActive,
                ]}
              >
                {catColorLabels[c]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>性別</Text>
        <View style={styles.genderContainer}>
          {genders.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderButton, gender === g && styles.genderButtonActive]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === g && styles.genderTextActive,
                ]}
              >
                {catGenderSymbols[g]} {genderLabels[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>誕生日</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
            {birthDate ? formatDate(birthDate) : '未設定（タップして選択）'}
          </Text>
        </TouchableOpacity>
        {birthDate && (
          <TouchableOpacity onPress={() => setBirthDate(undefined)}>
            <Text style={styles.clearDate}>誕生日をクリア</Text>
          </TouchableOpacity>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={birthDate ? new Date(birthDate) : new Date()}
            mode="date"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'set' && selectedDate) {
                setBirthDate(selectedDate.toISOString());
              }
            }}
          />
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {editId && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="この猫を削除"
          >
            <Text style={styles.deleteButtonText}>🗑 この猫を削除</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="猫の情報を保存する"
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
    photoButton: {
      alignSelf: 'center',
      marginBottom: spacing.xxl,
      borderRadius: 75,
      overflow: 'hidden',
    },
    photo: {
      width: 150,
      height: 150,
      borderRadius: 75,
    },
    photoPlaceholder: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: colors.backgroundMuted,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    photoPlaceholderEmoji: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    photoPlaceholderText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.xxl,
    },
    colorContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    colorButton: {
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.card,
      minWidth: 70,
    },
    colorButtonActive: {
      backgroundColor: colors.primary,
    },
    colorEmoji: {
      fontSize: 24,
      marginBottom: spacing.xs,
    },
    colorLabel: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    colorLabelActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    genderContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    genderButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.card,
    },
    genderButtonActive: {
      backgroundColor: colors.primary,
    },
    genderText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    genderTextActive: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    dateText: {
      fontSize: 16,
      color: colors.text,
    },
    datePlaceholder: {
      fontSize: 16,
      color: colors.textPlaceholder,
    },
    clearDate: {
      fontSize: 13,
      color: colors.primary,
      marginTop: -spacing.lg,
      marginBottom: spacing.xxl,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: spacing.lg,
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
