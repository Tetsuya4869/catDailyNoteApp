import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signInWithGoogle, loading } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.catEmoji}>🐱</Text>
        <Text style={styles.title}>猫の日記</Text>
        <Text style={styles.subtitle}>
          愛猫との毎日を記録しよう
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.googleButton}
          onPress={signInWithGoogle}
          activeOpacity={0.8}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>Googleでログイン</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    catEmoji: {
      fontSize: 80,
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    buttonContainer: {
      width: '100%',
      paddingBottom: spacing.xxl,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    googleIcon: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#4285F4',
      marginRight: spacing.md,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333333',
    },
    disclaimer: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.lg,
      lineHeight: 18,
    },
  });
