import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  onSelect: (prompt: string) => void;
  prompts: string[];
};

export function SuggestedPrompts({ onSelect, prompts }: Props) {
  const palette = useAppTheme();

  if (!prompts.length) return null;

  return (
    <View style={styles.wrap}>
      {prompts.map((prompt) => (
        <Pressable
          accessibilityRole="button"
          key={prompt}
          onPress={() => onSelect(prompt)}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.chipText, { color: palette.accentStrong }]}>{prompt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: {
    ...typography.label,
    fontSize: 11,
    textTransform: 'none',
  },
});
