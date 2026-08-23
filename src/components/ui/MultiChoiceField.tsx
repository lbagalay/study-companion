import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Choice<T extends string | number> = { label: string; value: T };
export function MultiChoiceField<T extends string | number>({ choices, error, label, onChange, value }: { choices: readonly Choice<T>[]; error?: string; label: string; onChange: (value: T[]) => void; value: T[] }) {
  const palette = useAppTheme();
  return <View style={styles.wrapper}><Text style={[styles.label, { color: palette.text }]}>{label}</Text><View style={styles.choices}>{choices.map((choice) => { const selected = value.includes(choice.value); return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={String(choice.value)} onPress={() => onChange(selected ? value.filter((v) => v !== choice.value) : [...value, choice.value])} style={({ pressed }) => [styles.choice, { backgroundColor: selected ? palette.accentSolid : palette.surface, borderColor: error ? palette.danger : selected ? palette.accentSolid : palette.border, opacity: pressed ? 0.76 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}><Text style={[styles.text, { color: palette.text }]}>{choice.label}</Text></Pressable>; })}</View>{error ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({ wrapper: { gap: spacing.sm }, label: typography.label, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { alignItems: 'center', borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, text: typography.label, error: { ...typography.caption, marginLeft: spacing.xs } });
