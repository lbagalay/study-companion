import type { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = PropsWithChildren<{ addLabel?: string; description?: string; empty: boolean; emptyMessage: string; error?: Error | null; loading: boolean; onAdd?: () => void; onRefresh: () => void; refreshing: boolean; title: string }>;
export function EntityList({ addLabel, children, description, empty, emptyMessage, error, loading, onAdd, onRefresh, refreshing, title }: Props) {
  const palette = useAppTheme();
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />} style={{ backgroundColor: palette.background }}>
    <ScreenHeader description={description} title={title} />{onAdd && addLabel ? <AppButton label={addLabel} onPress={onAdd} /> : null}
    <View style={styles.list}>{loading ? <FeedbackState loading message="Fetching the latest information." title="Loading" /> : error ? <FeedbackState actionLabel="Try again" message={error.message} onAction={onRefresh} title="Could not load" /> : empty ? <FeedbackState message={emptyMessage} title="Nothing here yet" /> : children}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg }, list: { gap: spacing.md, marginTop: spacing.lg } });
