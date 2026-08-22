import type { PropsWithChildren } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function AuthScreen({ children, description, title }: PropsWithChildren<{ description: string; title: string }>) {
  const palette = useAppTheme();
  return <ScreenContainer><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
    <View style={[styles.glowLarge, { backgroundColor: palette.accentSoft }]} />
    <View style={[styles.glowSmall, { backgroundColor: palette.lavenderSoft }]} />
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.header}>
        <View style={[styles.mark, { backgroundColor: palette.accentSoft }]}><Ionicons color={palette.accent} name="sparkles" size={23} /></View>
        <Text style={[styles.brand, { color: palette.accentStrong }]}>STUDY COMPANION</Text>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        <Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text>
      </View>
      <View style={styles.form}>{children}</View>
    </View>
    <Text style={[styles.footer, { color: palette.textMuted }]}>Plan gently. Learn confidently.</Text>
  </KeyboardAvoidingView></ScreenContainer>;
}
const styles = StyleSheet.create({
  container: { alignSelf: 'center', flex: 1, justifyContent: 'center', maxWidth: 540, paddingVertical: spacing.xxl, width: '100%' },
  card: { borderRadius: radii.xl, borderWidth: 1, boxShadow: '0 24px 70px rgba(180, 72, 78, 0.12)', padding: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  mark: { alignItems: 'center', borderRadius: radii.pill, height: 48, justifyContent: 'center', marginBottom: spacing.xs, width: 48 },
  brand: typography.label,
  title: { ...typography.title, textAlign: 'center' },
  description: { ...typography.body, maxWidth: 390, textAlign: 'center' },
  form: { gap: spacing.md },
  footer: { ...typography.caption, marginTop: spacing.lg, textAlign: 'center' },
  glowLarge: { borderRadius: radii.pill, height: 260, opacity: 0.72, pointerEvents: 'none', position: 'absolute', right: -110, top: 40, width: 260 },
  glowSmall: { borderRadius: radii.pill, bottom: 48, height: 170, left: -78, opacity: 0.7, pointerEvents: 'none', position: 'absolute', width: 170 },
});
