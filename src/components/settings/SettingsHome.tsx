import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChoiceField } from '@/components/ui/ChoiceField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTheme } from '@/providers/ThemeProvider';

export function SettingsHome() {
  const { scheme, setScheme } = useTheme();
  const router = useRouter();

  return (
    <ScreenContainer>
      <ScreenHeader back description="Appearance and folder styling." title="Settings" />

      <View style={styles.section}>
        <ChoiceField
          choices={[
            { label: 'Light mode', value: 'light' },
            { label: 'Dark mode', value: 'dark' },
          ]}
          label="Appearance"
          onChange={setScheme}
          value={scheme}
        />
      </View>

      <View style={styles.rows}>
        <SettingsRow
          description="Pick an accent color for the whole app."
          icon="color-palette-outline"
          onPress={() => router.push('/settings/themes')}
          title="Themes"
        />

        <SettingsRow
          description="Choose the pattern style for your subject folders."
          icon="folder-outline"
          onPress={() => router.push('/settings/folder-designs')}
          title="Folder designs"
        />
      </View>
    </ScreenContainer>
  );
}

function SettingsRow({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  title: string;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: palette.accentSoft }]}>
        <Ionicons color={palette.accent} name={icon} size={20} />
      </View>

      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.rowDescription, { color: palette.textMuted }]}>{description}</Text>
      </View>

      <Ionicons color={palette.textMuted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },

  rows: {
    gap: spacing.sm,
  },

  row: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },

  rowIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },

  rowCopy: {
    flex: 1,
    gap: 2,
  },

  rowTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    lineHeight: 20,
  },

  rowDescription: {
    ...typography.caption,
  },
});
