import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { EditorialBackdrop } from '@/components/ui/EditorialBackdrop';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = PropsWithChildren<{
  addLabel?: string;
  description?: string;
  empty: boolean;
  emptyMessage: string;
  error?: Error | null;
  loading: boolean;
  onAdd?: () => void;
  onRefresh: () => void;
  onSecondaryAdd?: () => void;
  refreshing: boolean;
  secondaryAddIcon?: ComponentProps<typeof Ionicons>['name'];
  secondaryAddLabel?: string;
  title: string;
}>;
export function EntityList({
  addLabel,
  children,
  description,
  empty,
  emptyMessage,
  error,
  loading,
  onAdd,
  onRefresh,
  onSecondaryAdd,
  refreshing,
  secondaryAddIcon = 'sparkles-outline',
  secondaryAddLabel,
  title,
}: Props) {
  const palette = useAppTheme();
  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <EditorialBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
        <ScreenHeader description={description} title={title} />
        {onAdd && addLabel ? (
          <View style={styles.actions}>
            <AppButton icon="add-circle-outline" label={addLabel} onPress={onAdd} />
            {onSecondaryAdd && secondaryAddLabel ? (
              <AppButton
                icon={secondaryAddIcon}
                label={secondaryAddLabel}
                onPress={onSecondaryAdd}
                variant="secondary"
              />
            ) : null}
          </View>
        ) : null}
        <View style={styles.list}>
          {loading ? (
            <FeedbackState loading message="Fetching the latest information." title="Loading" />
          ) : error ? (
            <FeedbackState
              actionLabel="Try again"
              message={error.message}
              onAction={onRefresh}
              title="Could not load"
            />
          ) : empty ? (
            <FeedbackState message={emptyMessage} title="Nothing here yet" />
          ) : (
            children
          )}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 900,
    paddingBottom: 124,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  actions: { gap: spacing.sm },
  list: { gap: spacing.md, marginTop: spacing.lg },
});
