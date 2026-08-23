import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Choice<T extends string | number | boolean> = { label: string; value: T };
type Props<T extends string | number | boolean> = { choices: readonly Choice<T>[]; label: string; onChange: (value: T) => void; value: T };

export function ChoiceField<T extends string | number | boolean>({ choices, label, onChange, value }: Props<T>) {
  const palette = useAppTheme();
  return <View style={styles.wrapper}>
    <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    <View style={styles.choices}>{choices.map((choice) => {
      const selected = choice.value === value;
      return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={String(choice.value)} onPress={() => onChange(choice.value)} style={[styles.choice, { backgroundColor: selected ? palette.accentSolid : palette.surface, borderColor: selected ? palette.accentSolid : palette.border }]}><Text style={[styles.choiceText, { color: selected ? '#FFFFFF' : palette.text }]}>{choice.label}</Text></Pressable>;
    })}</View>
  </View>;
}

const styles = StyleSheet.create({ wrapper: { gap: spacing.sm }, label: typography.label, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { borderRadius: radii.sm, borderWidth: 1, minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, choiceText: typography.label });
