import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = { accent?: string; badge?: string; metadata?: string; onPress?: () => void; subtitle?: string; title: string };
export function EntityCard({ accent, badge, metadata, onPress, subtitle, title }: Props) {
  const palette = useAppTheme();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.992 : 1 }] }]}>
    <View style={[styles.accent, { backgroundColor: accent ?? palette.accent }]}><Ionicons color={palette.surface} name="sparkles" size={12} /></View><View style={styles.copy}><Text style={[styles.title, { color: palette.text }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text> : null}{metadata ? <Text style={[styles.metadata, { color: palette.textMuted }]}>{metadata}</Text> : null}</View>
    {badge ? <Text style={[styles.badge, { backgroundColor: palette.accentSoft, color: palette.accentStrong }]}>{badge}</Text> : <Ionicons color={palette.textMuted} name="chevron-forward" size={20} />}
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, boxShadow: '0 10px 28px rgba(14, 27, 72, 0.07)', flexDirection: 'row', gap: spacing.md, overflow: 'hidden', padding: 17 },
  accent: { alignItems: 'center', borderRadius: radii.pill, height: 34, justifyContent: 'center', width: 34 },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.sectionTitle, fontSize: 19, lineHeight: 24 },
  subtitle: { ...typography.body, fontSize: 14, lineHeight: 20 },
  metadata: typography.caption,
  badge: { ...typography.label, borderRadius: radii.pill, fontSize: 9, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: 6 },
});
