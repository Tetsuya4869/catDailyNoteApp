import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCats } from '../contexts/CatContext';
import { syncPendingCatOps } from '../storage/catStorage';
import { syncPendingDiaryOps } from '../storage/diaryStorage';
import { syncPendingHealthOps } from '../storage/healthStorage';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type BannerState = 'hidden' | 'offline' | 'syncing' | 'synced';

const SYNCED_VISIBLE_MS = 2500;

export default function SyncStatusBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshCats } = useCats();
  const [state, setState] = useState<BannerState>('hidden');
  const wasOffline = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = NetInfo.addEventListener((netState) => {
      const online = netState.isConnected === true;

      if (!online) {
        wasOffline.current = true;
        setState('offline');
        return;
      }

      // オンライン復帰: オフラインだった場合のみ保留中の操作を同期
      if (wasOffline.current) {
        wasOffline.current = false;
        setState('syncing');
        (async () => {
          try {
            await Promise.all([
              syncPendingCatOps(user.id),
              syncPendingDiaryOps(user.id),
              syncPendingHealthOps(user.id),
            ]);
            await refreshCats();
          } catch (err) {
            console.error('Auto-sync failed:', err);
          } finally {
            setState('synced');
          }
        })();
      } else {
        setState('hidden');
      }
    });

    return () => unsubscribe();
  }, [user?.id, refreshCats]);

  // 「同期しました」は一定時間後に自動で消す
  useEffect(() => {
    if (state !== 'synced') return;
    const timer = setTimeout(() => setState('hidden'), SYNCED_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // 表示/非表示のフェードアニメーション
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: state === 'hidden' ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [state, opacity]);

  if (state === 'hidden') return null;

  const styles = createStyles(colors);
  const config: Record<
    Exclude<BannerState, 'hidden'>,
    { text: string; background: string }
  > = {
    offline: {
      text: '📴 オフライン — 変更は後で同期されます',
      background: colors.brown,
    },
    syncing: { text: '🔄 同期中…', background: colors.primary },
    synced: { text: '✅ 同期しました', background: colors.saturday },
  };

  const { text, background } = config[state];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.sm, backgroundColor: background, opacity },
      ]}
    >
      <View style={styles.inner} accessibilityRole="alert" accessibilityLabel={text}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      paddingBottom: spacing.sm,
      borderBottomLeftRadius: borderRadius.md,
      borderBottomRightRadius: borderRadius.md,
    },
    inner: {
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
    },
    text: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: 'bold',
    },
  });
