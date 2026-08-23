import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MotionIcon } from '@/components/ui/MotionIcon';

export function ScreenHeader({ back = false, description, title }: { back?: boolean; description?: string; title: string }) {
  const palette = useAppTheme();
  const router = useRouter();
  return <View style={styles.header}>
    {back ? <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}><Ionicons color={palette.text} name="arrow-back" size={21} /></Pressable> : null}
    <View style={styles.copy}><View style={styles.eyebrowRow}><MotionIcon backgroundColor={palette.accentSoft} color={palette.accentStrong} iconSize={13} loop name="sparkles" size={28} /><Text style={[styles.eyebrow, { color: palette.accentStrong }]}>Study companion</Text></View><Text style={[styles.title, { color: palette.text }]}>{title}</Text>{description ? <Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text> : null}<View style={styles.ruleWrap}><View style={[styles.rule, { backgroundColor: palette.accent }]} /><View style={[styles.ruleDot, { backgroundColor: palette.lavender }]} /></View></View>
  </View>;
}

const styles = StyleSheet.create({ header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.lg }, back: { alignItems: 'center', borderRadius: 999, borderWidth: 1, height: 42, justifyContent: 'center', marginTop: 20, width: 42 }, copy: { flex: 1, gap: spacing.xs }, eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm }, eyebrow: typography.label, title: typography.title, description: { ...typography.body, maxWidth: 620 }, ruleWrap: { alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: spacing.sm }, rule: { borderRadius: 999, height: 2, opacity: 0.75, width: 52 }, ruleDot: { borderRadius: 999, height: 5, width: 5 } });
