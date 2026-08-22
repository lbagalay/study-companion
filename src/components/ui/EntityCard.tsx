import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = { accent?: string; badge?: string; metadata?: string; onPress?: () => void; subtitle?: string; title: string };
export function EntityCard({ accent, badge, metadata, onPress, subtitle, title }: Props) {
  const palette = useAppTheme();
  return <Pressable accessibilityRole={onPress ? 'button' : undefined} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: palette.surface, borderColor: palette.border, opacity: pressed ? 0.75 : 1 }]}>
    <View style={[styles.accent, { backgroundColor: accent ?? palette.accent }]} /><View style={styles.copy}><Text style={[styles.title, { color: palette.text }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text> : null}{metadata ? <Text style={[styles.metadata, { color: palette.textMuted }]}>{metadata}</Text> : null}</View>
    {badge ? <Text style={[styles.badge, { backgroundColor: palette.accentSoft, color: palette.accent }]}>{badge}</Text> : <Ionicons color={palette.textMuted} name="chevron-forward" size={20} />}
  </Pressable>;
}
const styles = StyleSheet.create({ card: { alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, overflow: 'hidden', padding: spacing.md }, accent: { alignSelf: 'stretch', borderRadius: radii.pill, width: 5 }, copy: { flex: 1, gap: spacing.xs }, title: typography.sectionTitle, subtitle: typography.body, metadata: typography.caption, badge: { ...typography.caption, borderRadius: radii.pill, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs } });
