import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAppTheme } from '@/hooks/useAppTheme';
import { radii, spacing, typography } from '@/constants/theme';

type PlaceholderScreenProps = {
  description: string;
  eyebrow: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  message: string;
  title: string;
};

export function PlaceholderScreen({
  description,
  eyebrow,
  icon,
  message,
  title,
}: PlaceholderScreenProps) {
  const palette = useAppTheme();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: palette.accentStrong }]}>{eyebrow}</Text>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text>
      </View>

      <View
        style={[
          styles.emptyState,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: palette.accentSoft }]}>
          <Ionicons color={palette.accent} name={icon} size={28} />
        </View>
        <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
        <Text style={[styles.helper, { color: palette.textMuted }]}>
          We’ll build this in the next phase.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  title: typography.title,
  description: {
    ...typography.body,
    maxWidth: 520,
  },
  emptyState: {
    alignItems: 'flex-start',
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  message: typography.sectionTitle,
  helper: typography.body,
});
