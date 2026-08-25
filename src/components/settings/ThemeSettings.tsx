import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { accentThemeMeta, radii, spacing, typography, type AccentThemeKey } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTheme } from '@/providers/ThemeProvider';

const KEYS = Object.keys(accentThemeMeta) as AccentThemeKey[];

export function ThemeSettings() {
  const palette = useAppTheme();
  const { accentKey, setAccentKey } = useTheme();

  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Choose the accent color used across buttons, tabs, and highlights."
        title="Themes"
      />

      <View style={styles.grid}>
        {KEYS.map((key) => {
          const meta = accentThemeMeta[key];
          const selected = key === accentKey;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={key}
              onPress={() => setAccentKey(key)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: palette.surface,
                  borderColor: selected ? meta.swatch : palette.border,
                  borderWidth: selected ? 2 : 1,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: meta.swatch }]} />

              <Text style={[styles.cardTitle, { color: palette.text }]}>{meta.label}</Text>

              {selected ? (
                <Ionicons color={meta.swatch} name="checkmark-circle" size={18} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  card: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 150,
    padding: spacing.md,
  },

  swatch: {
    borderRadius: radii.pill,
    height: 28,
    width: 28,
  },

  cardTitle: {
    ...typography.label,
    flex: 1,
  },

  checkSpacer: {
    height: 18,
    width: 18,
  },
});
