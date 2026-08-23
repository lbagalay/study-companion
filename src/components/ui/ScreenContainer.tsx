import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditorialBackdrop } from '@/components/ui/EditorialBackdrop';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function ScreenContainer({ children }: PropsWithChildren) {
  const palette = useAppTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <EditorialBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: 840,
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: 124,
  },
});
