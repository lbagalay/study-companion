import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function AuthScreen({ children, description, title }: PropsWithChildren<{ description: string; title: string }>) {
  const palette = useAppTheme();
  return <ScreenContainer><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
    <View style={styles.header}><Text style={[styles.brand, { color: palette.accent }]}>STUDY COMPANION</Text><Text style={[styles.title, { color: palette.text }]}>{title}</Text><Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text></View>
    <View style={styles.form}>{children}</View>
  </KeyboardAvoidingView></ScreenContainer>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl }, header: { gap: spacing.sm, marginBottom: spacing.xl }, brand: typography.label, title: typography.title, description: typography.body, form: { gap: spacing.md } });
