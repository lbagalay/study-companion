import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { getDailyQuote } from '@/constants/quotes';
import { useAppTheme } from '@/hooks/useAppTheme';

/** Always-visible companion to `DailyQuoteModal` — same quote, no dismiss state. */
export function DailyQuoteCard() {
  const palette = useAppTheme();
  const quote = getDailyQuote();

  return (
    <View
      style={[styles.card, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}
    >
      <Text style={styles.emoji}>🐻</Text>
      <Text style={[styles.quote, { color: palette.text }]}>{quote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  emoji: {
    fontSize: 22,
  },
  quote: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
