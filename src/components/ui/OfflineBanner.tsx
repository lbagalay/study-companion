import { useNetworkState } from 'expo-network';
import { StyleSheet, Text, View } from 'react-native';
import { brand, spacing, typography } from '@/constants/theme';

export function OfflineBanner() {
  const network = useNetworkState();
  if (network.isConnected !== false && network.isInternetReachable !== false) return null;
  return <View accessibilityRole="alert" style={styles.banner}><Text style={styles.text}>You’re offline. Recent information may still be visible.</Text></View>;
}
const styles = StyleSheet.create({ banner: { backgroundColor: brand.blue, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, text: { ...typography.caption, color: brand.ink, textAlign: 'center' } });
