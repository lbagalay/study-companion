import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export function EditorialBackdrop() {
  const palette = useAppTheme();
  return <View style={styles.backdrop}>
    <View style={[styles.washTop, { backgroundColor: palette.accentSoft }]} />
    <View style={[styles.washBottom, { backgroundColor: palette.lavenderSoft }]} />
    <View style={[styles.ribbon, { backgroundColor: palette.lavenderSoft }]} />
    <View style={[styles.dot, styles.dotOne, { backgroundColor: palette.accent }]} />
    <View style={[styles.dot, styles.dotTwo, { backgroundColor: palette.lavender }]} />
    <View style={[styles.dot, styles.dotThree, { backgroundColor: palette.accent }]} />
    <View style={styles.stripes}>{Array.from({ length: 12 }, (_, index) => <View key={index} style={[styles.stripe, { backgroundColor: index % 2 === 0 ? palette.accentSoft : 'transparent' }]} />)}</View>
    <Ionicons color={palette.accent} name="heart-outline" size={18} style={styles.heart} />
    <Ionicons color={palette.lavender} name="sparkles-outline" size={16} style={styles.sparkle} />
    <Ionicons color={palette.accent} name="heart" size={8} style={styles.miniHeart} />
  </View>;
}

const styles = StyleSheet.create({
  backdrop: { bottom: 0, left: 0, overflow: 'hidden', pointerEvents: 'none', position: 'absolute', right: 0, top: 0 },
  washTop: { borderRadius: 999, height: 270, opacity: 0.36, position: 'absolute', right: -120, top: -105, width: 270 },
  washBottom: { borderRadius: 999, bottom: 52, height: 230, left: -120, opacity: 0.25, position: 'absolute', width: 230 },
  ribbon: { height: 32, opacity: 0.28, position: 'absolute', right: -35, top: 118, transform: [{ rotate: '-9deg' }], width: 190 },
  dot: { borderRadius: 999, height: 5, opacity: 0.35, position: 'absolute', width: 5 },
  dotOne: { right: '20%', top: 92 },
  dotTwo: { right: '13%', top: 108 },
  dotThree: { left: '12%', top: 154 },
  stripes: { bottom: 0, flexDirection: 'row', height: 110, left: 0, opacity: 0.2, position: 'absolute', right: 0 },
  stripe: { flex: 1 },
  heart: { opacity: 0.45, position: 'absolute', right: '10%', top: 180, transform: [{ rotate: '12deg' }] },
  sparkle: { left: '8%', opacity: 0.45, position: 'absolute', top: 88 },
  miniHeart: { left: '14%', opacity: 0.35, position: 'absolute', top: 130, transform: [{ rotate: '-16deg' }] },
});
