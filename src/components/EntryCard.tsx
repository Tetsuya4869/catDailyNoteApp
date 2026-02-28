import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DiaryEntry } from '../types/DiaryEntry';

interface Props {
  entry: DiaryEntry;
  onPress: () => void;
}

export default function EntryCard({ entry, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: entry.photoUri }} style={styles.thumbnail} />
      <View style={styles.info}>
        <Text style={styles.date}>{entry.date}</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {entry.caption || '(キャプションなし)'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  thumbnail: {
    width: 90,
    height: 90,
    backgroundColor: '#eee',
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  date: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  caption: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
});
