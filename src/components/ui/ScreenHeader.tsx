import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function ScreenHeader({ back = false, description, title }: { back?: boolean; description?: string; title: string }) {
  const palette = useAppTheme();
  const router = useRouter();
  return <View style={styles.header}>
    {back ? <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}><Ionicons color={palette.text} name="arrow-back" size={21} /></Pressable> : null}
    <View style={styles.copy}><Text style={[styles.eyebrow, { color: palette.accentStrong }]}>Study companion</Text><Text style={[styles.title, { color: palette.text }]}>{title}</Text>{description ? <Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text> : null}<View style={[styles.rule, { backgroundColor: palette.accent }]} /></View>
  </View>;
}

const styles = StyleSheet.create({ header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.lg }, back: { alignItems: 'center', borderRadius: 999, borderWidth: 1, height: 42, justifyContent: 'center', marginTop: 20, width: 42 }, copy: { flex: 1, gap: spacing.xs }, eyebrow: typography.label, title: typography.title, description: { ...typography.body, maxWidth: 620 }, rule: { borderRadius: 999, height: 2, marginTop: spacing.sm, opacity: 0.75, width: 52 } });
