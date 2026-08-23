import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Choice<T extends string | number> = { label: string; value: T };
export function MultiChoiceField<T extends string | number>({ choices, label, onChange, value }: { choices: readonly Choice<T>[]; label: string; onChange: (value: T[]) => void; value: T[] }) {
  const palette = useAppTheme();
  return <View style={styles.wrapper}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><View style={styles.choices}>{choices.map((choice) => { const selected = value.includes(choice.value); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={String(choice.value)} onPress={() => onChange(selected ? value.filter((v) => v !== choice.value) : [...value, choice.value])} style={[styles.choice, { backgroundColor: selected ? palette.accentSolid : palette.surface, borderColor: selected ? palette.accentSolid : palette.border }]}><Text style={[styles.text, { color: selected ? '#FFFFFF' : palette.text }]}>{choice.label}</Text></Pressable>; })}</View></View>;
}
const styles = StyleSheet.create({ wrapper: { gap: spacing.sm }, label: typography.label, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { borderRadius: radii.sm, borderWidth: 1, minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, text: typography.label });
