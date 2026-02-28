import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { deleteEntry } from '../storage/storage';
import { RootStackParamList } from '../types/DiaryEntry';

type Props = NativeStackScreenProps<RootStackParamList, 'EntryDetail'>;

export default function EntryDetailScreen({ route, navigation }: Props) {
  const { entry } = route.params;

  function handleDelete() {
    Alert.alert('削除しますか？', 'この日記を削除します。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entry.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: entry.photoUri }} style={styles.photo} resizeMode="cover" />

      <View style={styles.body}>
        <Text style={styles.date}>{entry.date}</Text>
        <Text style={styles.caption}>
          {entry.caption || '(キャプションなし)'}
        </Text>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
        <Text style={styles.deleteButtonText}>この日記を削除する</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  content: {
    paddingBottom: 40,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#ddd',
  },
  body: {
    padding: 20,
  },
  date: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  caption: {
    fontSize: 17,
    color: '#333',
    lineHeight: 26,
  },
  deleteButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e05a5a',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#e05a5a',
    fontSize: 15,
    fontWeight: '600',
  },
});
