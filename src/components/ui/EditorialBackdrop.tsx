import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export function EditorialBackdrop() {
  const palette = useAppTheme();
  return <View pointerEvents="none" style={styles.backdrop}>
    <View style={[styles.washTop, { backgroundColor: palette.accentSoft }]} />
    <View style={[styles.washBottom, { backgroundColor: palette.lavenderSoft }]} />
    <View style={styles.stripes}>{Array.from({ length: 12 }, (_, index) => <View key={index} style={[styles.stripe, { backgroundColor: index % 2 === 0 ? palette.accentSoft : 'transparent' }]} />)}</View>
    <Ionicons color={palette.accent} name="heart-outline" size={18} style={styles.heart} />
    <Ionicons color={palette.lavender} name="sparkles-outline" size={16} style={styles.sparkle} />
  </View>;
}

const styles = StyleSheet.create({
  backdrop: { bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0 },
  washTop: { borderRadius: 999, height: 270, opacity: 0.36, position: 'absolute', right: -120, top: -105, width: 270 },
  washBottom: { borderRadius: 999, bottom: 52, height: 230, left: -120, opacity: 0.25, position: 'absolute', width: 230 },
  stripes: { bottom: 0, flexDirection: 'row', height: 110, left: 0, opacity: 0.2, position: 'absolute', right: 0 },
  stripe: { flex: 1 },
  heart: { opacity: 0.45, position: 'absolute', right: '10%', top: 180, transform: [{ rotate: '12deg' }] },
  sparkle: { left: '8%', opacity: 0.45, position: 'absolute', top: 88 },
});
