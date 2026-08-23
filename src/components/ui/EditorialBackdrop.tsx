import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

export function EditorialBackdrop() {
  const palette = useAppTheme();
  const [drift] = useState(() => new Animated.Value(0));
  const useNativeDriver = Platform.OS !== 'web';
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted || reduceMotion) return;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(drift, { duration: 2400, easing: Easing.inOut(Easing.sin), toValue: 1, useNativeDriver }),
        Animated.timing(drift, { duration: 2400, easing: Easing.inOut(Easing.sin), toValue: 0, useNativeDriver }),
      ]));
      animation.start();
    });
    return () => { mounted = false; animation?.stop(); };
  }, [drift, useNativeDriver]);
  return <View style={styles.backdrop}>
    <View style={[styles.washTop, { backgroundColor: palette.accentSoft }]} />
    <View style={[styles.washBottom, { backgroundColor: palette.lavenderSoft }]} />
    <View style={[styles.ribbon, { backgroundColor: palette.lavenderSoft }]} />
    <View style={[styles.dot, styles.dotOne, { backgroundColor: palette.accent }]} />
    <View style={[styles.dot, styles.dotTwo, { backgroundColor: palette.lavender }]} />
    <View style={[styles.dot, styles.dotThree, { backgroundColor: palette.accent }]} />
    <View style={styles.stripes}>{Array.from({ length: 12 }, (_, index) => <View key={index} style={[styles.stripe, { backgroundColor: index % 2 === 0 ? palette.accentSoft : 'transparent' }]} />)}</View>
    <Animated.View style={[styles.heart, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '20deg'] }) }] }]}><Ionicons color={palette.accent} name="heart-outline" size={18} /></Animated.View>
    <Animated.View style={[styles.sparkle, { opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.72] }), transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.14] }) }] }]}><Ionicons color={palette.lavender} name="sparkles-outline" size={16} /></Animated.View>
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
  heart: { opacity: 0.45, position: 'absolute', right: '10%', top: 180 },
  sparkle: { left: '8%', position: 'absolute', top: 88 },
  miniHeart: { left: '14%', opacity: 0.35, position: 'absolute', top: 130, transform: [{ rotate: '-16deg' }] },
});
