import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import EntryCard from '../components/EntryCard';
import { loadEntries } from '../storage/storage';
import { DiaryEntry, RootStackParamList } from '../types/DiaryEntry';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadEntries().then(setEntries);
    }, [])
  );

  return (
    <View style={styles.container}>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🐱</Text>
          <Text style={styles.emptyText}>日記がまだありません</Text>
          <Text style={styles.emptySubText}>右上の「+」から写真を追加しよう</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EntryCard
              entry={item}
              onPress={() => navigation.navigate('EntryDetail', { entry: item })}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  list: {
    paddingVertical: 10,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    color: '#555',
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});
