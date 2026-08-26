import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { getDailyQuote, getDailyQuoteKey } from '@/constants/quotes';
import { useAppTheme } from '@/hooks/useAppTheme';

const STORAGE_KEY = 'study-companion-daily-quote-seen';

/**
 * Pops up once per calendar day (tracked in AsyncStorage, so it survives
 * reloads within the same day) with a short word of encouragement, and
 * closes on demand. The same quote also renders permanently on Home via
 * `DailyQuoteCard` — this is just the one-time daily nudge.
 */
export function DailyQuoteModal() {
  const palette = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const quote = getDailyQuote();

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(STORAGE_KEY).then((lastSeenKey) => {
      if (!active) return;
      if (lastSeenKey === getDailyQuoteKey()) return;

      setVisible(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [visible, opacity]);

  const close = () => {
    setVisible(false);
    void AsyncStorage.setItem(STORAGE_KEY, getDailyQuoteKey());
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable accessibilityLabel="Close" onPress={close} style={styles.backdrop} />

      <Animated.View
        style={[
          styles.card,
          { backgroundColor: palette.background, borderColor: palette.border, opacity },
        ]}
      >
        <Text style={styles.emoji}>🐻</Text>
        <Text style={[styles.title, { color: palette.text }]}>A little encouragement</Text>
        <Text style={[styles.quote, { color: palette.textMuted }]}>{quote}</Text>

        <Pressable
          accessibilityRole="button"
          onPress={close}
          style={[styles.closeButton, { backgroundColor: palette.accentSolid }]}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2000,
  },
  backdrop: {
    backgroundColor: 'rgba(14, 27, 72, 0.36)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    boxShadow: '0 18px 48px rgba(14, 27, 72, 0.24)',
    gap: spacing.sm,
    maxWidth: 360,
    padding: spacing.xl,
    width: '100%',
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 17,
    textAlign: 'center',
  },
  quote: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  closeButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 13,
    textTransform: 'none',
  },
});
