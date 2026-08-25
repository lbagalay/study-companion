import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkState } from 'expo-network';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function OfflineBanner() {
  const network = useNetworkState();
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  if (network.isConnected !== false && network.isInternetReachable !== false) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xs }]}>
      <View
        accessibilityRole="alert"
        style={[styles.banner, { backgroundColor: palette.accentStrong }]}
      >
        <Ionicons color={palette.surface} name="cloud-offline-outline" size={15} />
        <Text style={[styles.text, { color: palette.surface }]}>
          You’re offline. Recent information may still be visible.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    left: 0,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  banner: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radii.pill,
    boxShadow: '0 8px 20px rgba(14, 27, 72, 0.18)',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: { ...typography.caption, fontWeight: '600' },
});
