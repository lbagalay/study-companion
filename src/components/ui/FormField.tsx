import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = ComponentProps<typeof TextInput> & { error?: string; label: string };

export function FormField({ accessibilityLabel, error, label, multiline, style, ...props }: Props) {
  const palette = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <TextInput accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: props.editable === false }} placeholderTextColor={palette.textMuted} selectionColor={palette.accent} style={[styles.input, multiline && styles.multiline, { backgroundColor: palette.surface, borderColor: error ? palette.danger : palette.border, color: palette.text }, style]} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} {...props} />
      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrapper: { gap: spacing.xs }, label: typography.label, input: { borderRadius: radii.md, borderWidth: 1, fontSize: typography.body.fontSize, minHeight: 50, paddingHorizontal: spacing.md }, multiline: { minHeight: 112, paddingTop: spacing.md }, error: { ...typography.caption, marginLeft: spacing.xs } });
