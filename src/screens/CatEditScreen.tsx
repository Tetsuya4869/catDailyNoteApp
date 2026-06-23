import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Cat,
  CatColor,
  CatGender,
  catColorEmojis,
  catColorLabels,
  catGenderSymbols,
} from '../types';
import { saveCat, getCatById } from '../storage/catStorage';
import { useCats } from '../contexts/CatContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
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
  const { refreshCats } = useCats();
  const { user } = useAuth();
  const editId = route.params?.id;
  const [name, setName] = useState('');
  const [color, setColor] = useState<CatColor>('orange');
  const [gender, setGender] = useState<CatGender>('unknown');
  const [birthDate, setBirthDate] = useState<string | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  useEffect(() => {
    if (editId) {
      loadCat();
    }
  }, [editId]);

  async function loadCat() {
    if (!editId) return;
    const cat = await getCatById(editId);
    if (cat) {
      setName(cat.name);
      setColor(cat.color);
      setGender(cat.gender ?? 'unknown');
      setBirthDate(cat.birthDate);
      setPhotoUri(cat.photoUri);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('エラー', '名前を入力してください');
      return;
    }
    if (!user?.id) return;

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
    navigation.goBack();
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
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存する</Text>
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
    saveButton: {
      backgroundColor: colors.primary,
      margin: spacing.xl,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
