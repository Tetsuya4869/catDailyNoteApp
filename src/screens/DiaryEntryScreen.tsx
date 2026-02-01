import React, { useEffect, useState } from 'react';
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
import { format } from 'date-fns';
import { CatMood, DiaryEntry, moodEmojis, moodLabels } from '../types';
import { saveDiaryEntry, getDiaryEntryById } from '../storage/diaryStorage';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DiaryEntry'>;
  route: RouteProp<RootStackParamList, 'DiaryEntry'>;
};

const moods: CatMood[] = ['happy', 'sleepy', 'playful', 'hungry', 'relaxed'];

export default function DiaryEntryScreen({ navigation, route }: Props) {
  const editId = route.params?.id;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<CatMood>('happy');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [date, setDate] = useState(new Date().toISOString());

  useEffect(() => {
    if (editId) {
      loadEntry();
    }
  }, [editId]);

  async function loadEntry() {
    if (!editId) return;
    const entry = await getDiaryEntryById(editId);
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setMood(entry.mood);
      setPhotoUri(entry.photoUri);
      setDate(entry.date);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    const entry: DiaryEntry = {
      id: editId || Date.now().toString(),
      date,
      title: title.trim(),
      content: content.trim(),
      mood,
      photoUri,
      createdAt: editId ? date : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveDiaryEntry(entry);
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.dateText}>
          {format(new Date(date), 'yyyy年M月d日')}
        </Text>

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

        <Text style={styles.label}>今日の気分</Text>
        <View style={styles.moodContainer}>
          {moods.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodButton, mood === m && styles.moodButtonActive]}
              onPress={() => setMood(m)}
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

        <Text style={styles.label}>タイトル</Text>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="今日のできごと"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>日記</Text>
        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={setContent}
          placeholder="今日はどんな一日だった？"
          placeholderTextColor="#999"
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>保存する</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  photoButton: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 200,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#E8E0D5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D0C4B8',
    borderStyle: 'dashed',
  },
  photoPlaceholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#888',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  moodButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    minWidth: 60,
  },
  moodButtonActive: {
    backgroundColor: '#FF9966',
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    color: '#666',
  },
  moodLabelActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  titleInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  contentInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#FF9966',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
