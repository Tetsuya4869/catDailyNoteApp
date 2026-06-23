import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Cat, catColorEmojis } from '../types';
import { deleteCat } from '../storage/catStorage';
import { useCats } from '../contexts/CatContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

export default function CatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cats, selectedCatId, setSelectedCatId, refreshCats } = useCats();
  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshCats();
    }, [refreshCats])
  );

  function handleOpen(cat: Cat) {
    navigation.navigate('CatProfile', { catId: cat.id });
  }

  function handleDelete(cat: Cat) {
    if (!user?.id) return;
    Alert.alert(
      '削除確認',
      `${cat.name}を削除しますか？\n（関連する日記は残ります）`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (selectedCatId === cat.id) {
              setSelectedCatId(null);
            }
            await deleteCat(cat.id, user.id);
            refreshCats();
          },
        },
      ]
    );
  }

  function renderItem({ item }: { item: Cat }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpen(item)}
        onLongPress={() => handleDelete(item)}
      >
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {catColorEmojis[item.color]}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.color}>{catColorEmojis[item.color]}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {cats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🐱</Text>
          <Text style={styles.emptyText}>猫を登録しましょう</Text>
          <Text style={styles.emptySubText}>右下のボタンから追加</Text>
        </View>
      ) : (
        <>
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              タップでプロフィール・長押しで削除
            </Text>
          </View>
          <FlatList
            data={cats}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            numColumns={2}
          />
        </>
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CatEdit', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    hint: {
      padding: spacing.md,
      alignItems: 'center',
    },
    hintText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    list: {
      padding: spacing.sm,
    },
    card: {
      flex: 1,
      margin: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    photo: {
      width: '100%',
      aspectRatio: 1,
    },
    photoPlaceholder: {
      width: '100%',
      aspectRatio: 1,
      backgroundColor: colors.backgroundMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoPlaceholderText: {
      fontSize: 48,
    },
    info: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
    },
    name: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    color: {
      fontSize: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: 18,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    emptySubText: {
      fontSize: 14,
      color: colors.textPlaceholder,
    },
    fab: {
      position: 'absolute',
      right: spacing.xl,
      bottom: spacing.xl,
      width: 60,
      height: 60,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    fabText: {
      fontSize: 32,
      color: '#FFFFFF',
      lineHeight: 36,
    },
  });
