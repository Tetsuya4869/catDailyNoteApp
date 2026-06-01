import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DiaryEntry, moodEmojis } from '../types';
import { getDiaryEntries } from '../storage/diaryStorage';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

type Section = {
  title: string;
  data: DiaryEntry[];
};

export default function HomeScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  async function loadEntries() {
    const data = await getDiaryEntries();
    const sorted = [...data].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setEntries(sorted);
  }

  const sections = useMemo<Section[]>(() => {
    const groups = new Map<string, DiaryEntry[]>();
    entries.forEach((entry) => {
      const key = format(new Date(entry.date), 'yyyy年M月', { locale: ja });
      const arr = groups.get(key) || [];
      arr.push(entry);
      groups.set(key, arr);
    });
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [entries]);

  function renderItem({ item }: { item: DiaryEntry }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}
      >
        {item.photoUri && (
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>
              {format(new Date(item.date), 'M月d日(E)', { locale: ja })}
            </Text>
            <Text style={styles.mood}>{moodEmojis[item.mood]}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.content && (
            <Text style={styles.preview} numberOfLines={2}>
              {item.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  function renderSectionHeader({ section }: { section: Section }) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <Text style={styles.sectionHeaderCount}>{section.data.length}件</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🐱</Text>
          <Text style={styles.emptyText}>まだ日記がありません</Text>
          <Text style={styles.emptySubText}>右下のボタンから追加してね</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('DiaryEntry', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 8,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9966',
    marginRight: 8,
  },
  sectionHeaderCount: {
    fontSize: 12,
    color: '#999',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 150,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#888',
  },
  mood: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF9966',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 32,
    color: '#FFF',
    lineHeight: 36,
  },
});
