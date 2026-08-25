import { Children, type PropsWithChildren } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { spacing } from '@/constants/theme';

/**
 * Lays out two or more short fields side by side once there's room,
 * instead of every field stacking full-width regardless of screen size.
 */
export function FieldRow({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const inline = width >= 560;

  return (
    <View style={[styles.row, inline && styles.inline]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={styles.item}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.md },
  inline: { flexDirection: 'row' },
  item: { flex: 1, minWidth: 0 },
});
