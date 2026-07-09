import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';
import { spacing, borderRadius, ThemeColors } from '../constants/theme';

type SnackbarOptions = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type SnackbarContextType = {
  showSnackbar: (options: SnackbarOptions) => void;
};

const SnackbarContext = createContext<SnackbarContextType>({
  showSnackbar: () => {},
});

const DEFAULT_DURATION = 4000;

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const [current, setCurrent] = useState<SnackbarOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setCurrent(null));
  }, [opacity]);

  const showSnackbar = useCallback(
    (options: SnackbarOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(options);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(hide, options.durationMs ?? DEFAULT_DURATION);
    },
    [opacity, hide]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleAction() {
    if (timerRef.current) clearTimeout(timerRef.current);
    current?.onAction?.();
    hide();
  }

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      {current && (
        <Animated.View
          style={[
            styles.container,
            { bottom: insets.bottom + spacing.xl, opacity },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.snackbar}>
            <Text style={styles.message} numberOfLines={2}>
              {current.message}
            </Text>
            {current.actionLabel && current.onAction && (
              <TouchableOpacity
                onPress={handleAction}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={current.actionLabel}
              >
                <Text style={styles.action}>{current.actionLabel}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext);
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      zIndex: 2000,
    },
    snackbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.text,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.lg,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 6,
    },
    message: {
      flex: 1,
      color: colors.background,
      fontSize: 14,
    },
    action: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
    },
  });
