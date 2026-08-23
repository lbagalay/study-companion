import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = { actionLabel?: string; loading?: boolean; message: string; onAction?: () => void; title: string };
export function FeedbackState({ actionLabel, loading = false, message, onAction, title }: Props) {
  const palette = useAppTheme();
  return <View style={[styles.container, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
    {loading ? <ActivityIndicator color={palette.accent} size="large" /> : <View style={[styles.icon, { backgroundColor: palette.accentSoft }]}><Ionicons color={palette.accentStrong} name="heart-outline" size={23} /></View>}
    <Text style={[styles.title, { color: palette.text }]}>{title}</Text><Text style={[styles.message, { color: palette.textMuted }]}>{message}</Text>
    {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} variant="secondary" /> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { alignItems: 'center', borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, marginVertical: spacing.sm, padding: spacing.xl }, icon: { alignItems: 'center', borderRadius: radii.pill, height: 48, justifyContent: 'center', width: 48 }, title: { ...typography.sectionTitle, textAlign: 'center' }, message: { ...typography.body, maxWidth: 420, textAlign: 'center' } });
