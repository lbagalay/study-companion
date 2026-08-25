import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MotionIcon } from '@/components/ui/MotionIcon';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  message?: string;
  title: string;
  visible: boolean;
};

export function LoadingOverlay({ icon = 'cloud-upload-outline', message, title, visible }: Props) {
  const palette = useAppTheme();

  if (!visible) return null;

  return (
    <View
      accessibilityRole="alert"
      importantForAccessibility="yes"
      pointerEvents="auto"
      style={styles.backdrop}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <MotionIcon
          backgroundColor={palette.accentSoft}
          color={palette.accentStrong}
          iconSize={22}
          loop
          name={icon}
          size={52}
        />

        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>

        {message ? (
          <Text style={[styles.message, { color: palette.textMuted }]}>{message}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(14, 27, 72, 0.32)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: spacing.lg,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },

  card: {
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    boxShadow: '0 20px 44px rgba(14, 27, 72, 0.22)',
    gap: spacing.sm,
    maxWidth: 320,
    padding: spacing.xl,
    width: '100%',
  },

  title: {
    ...typography.sectionTitle,
    fontSize: 17,
    textAlign: 'center',
  },

  message: {
    ...typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
