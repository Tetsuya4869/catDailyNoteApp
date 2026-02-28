import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { copyPhotoToAppDir, saveEntry } from '../storage/storage';
import { RootStackParamList } from '../types/DiaryEntry';

type Props = NativeStackScreenProps<RootStackParamList, 'NewEntry'>;

export default function NewEntryScreen({ navigation }: Props) {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', '写真ライブラリへのアクセスを許可してください。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!photoUri) {
      Alert.alert('写真を選んでください');
      return;
    }
    setSaving(true);
    try {
      const localUri = await copyPhotoToAppDir(photoUri);
      const today = new Date();
      const date = today.toISOString().split('T')[0];
      await saveEntry({
        id: String(Date.now()),
        date,
        photoUri: localUri,
        caption: caption.trim(),
        createdAt: today.toISOString(),
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.photoButton} onPress={pickPhoto} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>写真を選ぶ</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>キャプション</Text>
        <TextInput
          style={styles.textInput}
          placeholder="今日の出来事を書いてみよう..."
          placeholderTextColor="#bbb"
          multiline
          value={caption}
          onChangeText={setCaption}
          maxLength={500}
        />
        <Text style={styles.counter}>{caption.length} / 500</Text>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{saving ? '保存中...' : '保存する'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  photoButton: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#e8e8e8',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderIcon: {
    fontSize: 48,
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#bbb',
    marginTop: 4,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#f4845f',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
