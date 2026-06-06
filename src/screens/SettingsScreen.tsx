import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ThemePreference } from '../storage/settingsStorage';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

const themeOptions: { value: ThemePreference; label: string; emoji: string }[] = [
  { value: 'system', label: 'システム設定に従う', emoji: '⚙️' },
  { value: 'light', label: 'ライトモード', emoji: '☀️' },
  { value: 'dark', label: 'ダークモード', emoji: '🌙' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>テーマ</Text>
      <View style={styles.card}>
        {themeOptions.map((option, index) => {
          const selected = preference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                index < themeOptions.length - 1 && styles.optionBorder,
              ]}
              onPress={() => setPreference(option.value)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>このアプリについて</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>アプリ名</Text>
          <Text style={styles.infoValue}>猫の日記</Text>
        </View>
        <View style={[styles.infoRow, styles.optionBorder]} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>バージョン</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerEmoji}>🐱</Text>
        <Text style={styles.footerText}>猫との毎日を大切に</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textMuted,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.xxl,
      overflow: 'hidden',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
    },
    optionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundMuted,
    },
    optionEmoji: {
      fontSize: 20,
      marginRight: spacing.md,
    },
    optionLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    checkmark: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.primary,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text,
    },
    infoValue: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    footer: {
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    footerEmoji: {
      fontSize: 40,
      marginBottom: spacing.sm,
    },
    footerText: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
