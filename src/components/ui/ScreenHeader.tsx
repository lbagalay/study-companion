import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function ScreenHeader({ back = false, description, title }: { back?: boolean; description?: string; title: string }) {
  const palette = useAppTheme();
  const router = useRouter();
  return <View style={styles.header}>
    {back ? <Pressable accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons color={palette.text} name="arrow-back" size={24} /></Pressable> : null}
    <View style={styles.copy}><Text style={[styles.title, { color: palette.text }]}>{title}</Text>{description ? <Text style={[styles.description, { color: palette.textMuted }]}>{description}</Text> : null}</View>
  </View>;
}

const styles = StyleSheet.create({ header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.md }, back: { paddingVertical: spacing.sm }, copy: { flex: 1, gap: spacing.xs }, title: typography.title, description: typography.body });
