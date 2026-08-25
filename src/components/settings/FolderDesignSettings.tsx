import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FolderIcon, folderPackMeta, type FolderPackKey } from '@/components/ui/FolderIcon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTheme } from '@/providers/ThemeProvider';

const KEYS = Object.keys(folderPackMeta) as FolderPackKey[];

const PREVIEW_SEEDS = ['preview-a', 'preview-b', 'preview-c', 'preview-d'];

export function FolderDesignSettings() {
  const palette = useAppTheme();
  const { folderPack, setFolderPack } = useTheme();

  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Choose the pattern style used for your subject folders."
        title="Folder designs"
      />

      <View style={styles.list}>
        {KEYS.map((key) => {
          const meta = folderPackMeta[key];
          const selected = key === folderPack;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={key}
              onPress={() => setFolderPack(key)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: selected ? palette.accentSolid : palette.border,
                  borderWidth: selected ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.preview}>
                {PREVIEW_SEEDS.map((seed) => (
                  <FolderIcon key={seed} pack={key} seed={seed} size={38} />
                ))}
              </View>

              <View style={styles.cardCopy}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{meta.label}</Text>
                <Text style={[styles.cardDescription, { color: palette.textMuted }]}>
                  {meta.description}
                </Text>
              </View>

              {selected ? (
                <Ionicons color={palette.accentSolid} name="checkmark-circle" size={20} />
              ) : (
                <View style={styles.checkSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },

  card: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },

  preview: {
    flexDirection: 'row',
    gap: 4,
  },

  cardCopy: {
    flex: 1,
    gap: 2,
  },

  cardTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    lineHeight: 20,
  },

  cardDescription: {
    ...typography.caption,
  },

  checkSpacer: {
    height: 20,
    width: 20,
  },
});
