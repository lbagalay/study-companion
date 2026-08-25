import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from '@/hooks/useAppTheme';

type Percent = `${number}%`;

type ScatterBase = {
  top: Percent;
  side: 'left' | 'right';
  offset: Percent;
  size: number;
  rotate: string;
  opacity: number;
};

type ScatterIcon =
  | (ScatterBase & {
      kind: 'icon';
      icon: ComponentProps<typeof Ionicons>['name'];
      colorKey: 'accent' | 'lavender';
    })
  | (ScatterBase & { kind: 'emoji'; glyph: string });

const scatter: ScatterIcon[] = [
  {
    kind: 'icon',
    icon: 'heart',
    top: '2%',
    side: 'left',
    offset: '30%',
    size: 22,
    rotate: '-10deg',
    opacity: 0.55,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'ribbon-outline',
    top: '6%',
    side: 'right',
    offset: '32%',
    size: 26,
    rotate: '16deg',
    opacity: 0.5,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart-outline',
    top: '11%',
    side: 'left',
    offset: '3%',
    size: 24,
    rotate: '8deg',
    opacity: 0.58,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'ribbon',
    top: '16%',
    side: 'right',
    offset: '5%',
    size: 22,
    rotate: '-12deg',
    opacity: 0.48,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'heart',
    top: '21%',
    side: 'right',
    offset: '22%',
    size: 20,
    rotate: '18deg',
    opacity: 0.52,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'ribbon-outline',
    top: '25%',
    side: 'left',
    offset: '18%',
    size: 24,
    rotate: '-6deg',
    opacity: 0.46,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'heart-outline',
    top: '30%',
    side: 'right',
    offset: '9%',
    size: 25,
    rotate: '-16deg',
    opacity: 0.55,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'heart',
    top: '34%',
    side: 'left',
    offset: '7%',
    size: 20,
    rotate: '12deg',
    opacity: 0.5,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'ribbon',
    top: '40%',
    side: 'left',
    offset: '26%',
    size: 23,
    rotate: '10deg',
    opacity: 0.46,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart-outline',
    top: '44%',
    side: 'right',
    offset: '30%',
    size: 22,
    rotate: '-8deg',
    opacity: 0.52,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'ribbon-outline',
    top: '49%',
    side: 'right',
    offset: '4%',
    size: 25,
    rotate: '20deg',
    opacity: 0.48,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'heart',
    top: '53%',
    side: 'left',
    offset: '4%',
    size: 21,
    rotate: '-14deg',
    opacity: 0.58,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart-outline',
    top: '57%',
    side: 'left',
    offset: '33%',
    size: 23,
    rotate: '6deg',
    opacity: 0.48,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'ribbon',
    top: '62%',
    side: 'right',
    offset: '17%',
    size: 22,
    rotate: '-18deg',
    opacity: 0.5,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart',
    top: '66%',
    side: 'right',
    offset: '35%',
    size: 20,
    rotate: '10deg',
    opacity: 0.52,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'ribbon-outline',
    top: '70%',
    side: 'left',
    offset: '10%',
    size: 24,
    rotate: '-10deg',
    opacity: 0.46,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart-outline',
    top: '75%',
    side: 'right',
    offset: '6%',
    size: 25,
    rotate: '14deg',
    opacity: 0.55,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart',
    top: '79%',
    side: 'left',
    offset: '20%',
    size: 21,
    rotate: '-6deg',
    opacity: 0.48,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'ribbon',
    top: '84%',
    side: 'right',
    offset: '26%',
    size: 23,
    rotate: '16deg',
    opacity: 0.5,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'heart-outline',
    top: '88%',
    side: 'left',
    offset: '5%',
    size: 22,
    rotate: '-12deg',
    opacity: 0.52,
    colorKey: 'lavender',
  },
  {
    kind: 'icon',
    icon: 'heart',
    top: '92%',
    side: 'right',
    offset: '13%',
    size: 20,
    rotate: '8deg',
    opacity: 0.46,
    colorKey: 'accent',
  },
  {
    kind: 'icon',
    icon: 'ribbon-outline',
    top: '96%',
    side: 'left',
    offset: '28%',
    size: 24,
    rotate: '-20deg',
    opacity: 0.44,
    colorKey: 'lavender',
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '4%',
    side: 'right',
    offset: '14%',
    size: 22,
    rotate: '-8deg',
    opacity: 0.6,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '14%',
    side: 'left',
    offset: '20%',
    size: 20,
    rotate: '10deg',
    opacity: 0.55,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '23%',
    side: 'left',
    offset: '34%',
    size: 24,
    rotate: '-6deg',
    opacity: 0.58,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '37%',
    side: 'right',
    offset: '16%',
    size: 21,
    rotate: '12deg',
    opacity: 0.52,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '47%',
    side: 'left',
    offset: '12%',
    size: 23,
    rotate: '-14deg',
    opacity: 0.56,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '60%',
    side: 'right',
    offset: '28%',
    size: 20,
    rotate: '8deg',
    opacity: 0.5,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '73%',
    side: 'left',
    offset: '24%',
    size: 22,
    rotate: '-10deg',
    opacity: 0.55,
  },
  {
    kind: 'emoji',
    glyph: '🧸',
    top: '90%',
    side: 'right',
    offset: '20%',
    size: 21,
    rotate: '14deg',
    opacity: 0.5,
  },
];

export function EditorialBackdrop() {
  const palette = useAppTheme();
  const [drift] = useState(() => new Animated.Value(0));
  const useNativeDriver = Platform.OS !== 'web';
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(drift, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            toValue: 1,
            useNativeDriver,
          }),
          Animated.timing(drift, {
            duration: 2400,
            easing: Easing.inOut(Easing.sin),
            toValue: 0,
            useNativeDriver,
          }),
        ]),
      );
      animation.start();
    });
    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [drift, useNativeDriver]);
  const colorFor = (key: 'accent' | 'lavender') =>
    key === 'accent' ? palette.accent : palette.lavender;
  return (
    <View style={styles.backdrop}>
      <View style={[styles.washTop, { backgroundColor: palette.accentSoft }]} />
      <View style={[styles.washMid, { backgroundColor: palette.peachSoft }]} />
      <View style={[styles.washBottom, { backgroundColor: palette.lavenderSoft }]} />
      <View style={[styles.ribbon, { backgroundColor: palette.lavenderSoft }]} />
      <View style={[styles.ribbonLow, { backgroundColor: palette.accentSoft }]} />
      <View style={[styles.dot, styles.dotOne, { backgroundColor: palette.accent }]} />
      <View style={[styles.dot, styles.dotTwo, { backgroundColor: palette.lavender }]} />
      <View style={[styles.dot, styles.dotThree, { backgroundColor: palette.accent }]} />
      <View style={[styles.dot, styles.dotFour, { backgroundColor: palette.lavender }]} />
      <View style={[styles.dot, styles.dotFive, { backgroundColor: palette.accent }]} />
      <View style={styles.stripes}>
        {Array.from({ length: 12 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.stripe,
              { backgroundColor: index % 2 === 0 ? palette.accentSoft : 'transparent' },
            ]}
          />
        ))}
      </View>
      <Animated.View
        style={[
          styles.heart,
          {
            transform: [
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
              {
                rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '20deg'] }),
              },
            ],
          },
        ]}
      >
        <Ionicons color={palette.accent} name="heart-outline" size={24} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sparkle,
          {
            opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] }),
            transform: [
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.14] }) },
            ],
          },
        ]}
      >
        <Ionicons color={palette.lavender} name="sparkles-outline" size={22} />
      </Animated.View>
      <Ionicons color={palette.accent} name="heart" size={14} style={styles.miniHeart} />
      <Animated.View
        style={[
          styles.sparkleLow,
          {
            opacity: drift.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0.45] }),
            transform: [
              { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.84] }) },
            ],
          },
        ]}
      >
        <Ionicons color={palette.accent} name="sparkles-outline" size={20} />
      </Animated.View>
      <Animated.View
        style={[
          styles.heartLow,
          {
            transform: [
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 2] }) },
              {
                rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '-6deg'] }),
              },
            ],
          },
        ]}
      >
        <Ionicons color={palette.lavender} name="heart-outline" size={22} />
      </Animated.View>
      <Ionicons color={palette.lavender} name="heart" size={13} style={styles.miniHeartLow} />
      {scatter.map((item, index) => {
        const position = {
          left: item.side === 'left' ? item.offset : undefined,
          right: item.side === 'right' ? item.offset : undefined,
          opacity: item.opacity,
          top: item.top,
          transform: [{ rotate: item.rotate }],
        };

        if (item.kind === 'emoji') {
          return (
            <Text key={index} style={[styles.scatterIcon, position, { fontSize: item.size }]}>
              {item.glyph}
            </Text>
          );
        }

        return (
          <Ionicons
            color={colorFor(item.colorKey)}
            key={index}
            name={item.icon}
            size={item.size}
            style={[styles.scatterIcon, position]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  washTop: {
    borderRadius: 999,
    height: 270,
    opacity: 0.55,
    position: 'absolute',
    right: -120,
    top: -105,
    width: 270,
  },
  washMid: {
    borderRadius: 999,
    height: 210,
    opacity: 0.4,
    position: 'absolute',
    right: -110,
    top: '38%',
    width: 210,
  },
  washBottom: {
    borderRadius: 999,
    bottom: 52,
    height: 230,
    left: -120,
    opacity: 0.42,
    position: 'absolute',
    width: 230,
  },
  ribbon: {
    height: 32,
    opacity: 0.48,
    position: 'absolute',
    right: -35,
    top: 118,
    transform: [{ rotate: '-9deg' }],
    width: 190,
  },
  ribbonLow: {
    height: 28,
    left: -30,
    opacity: 0.4,
    position: 'absolute',
    top: '55%',
    transform: [{ rotate: '8deg' }],
    width: 170,
  },
  dot: { borderRadius: 999, height: 7, opacity: 0.55, position: 'absolute', width: 7 },
  dotOne: { right: '20%', top: 92 },
  dotTwo: { right: '13%', top: 108 },
  dotThree: { left: '12%', top: 154 },
  dotFour: { left: '24%', top: '46%' },
  dotFive: { right: '18%', top: '63%' },
  stripes: {
    bottom: 0,
    flexDirection: 'row',
    height: 110,
    left: 0,
    opacity: 0.32,
    position: 'absolute',
    right: 0,
  },
  stripe: { flex: 1 },
  heart: { opacity: 0.65, position: 'absolute', right: '10%', top: 180 },
  sparkle: { left: '8%', position: 'absolute', top: 88 },
  miniHeart: {
    left: '14%',
    opacity: 0.55,
    position: 'absolute',
    top: 130,
    transform: [{ rotate: '-16deg' }],
  },
  sparkleLow: { left: '10%', position: 'absolute', top: '42%' },
  heartLow: { position: 'absolute', right: '9%', top: '58%' },
  miniHeartLow: {
    left: '19%',
    opacity: 0.5,
    position: 'absolute',
    top: '68%',
    transform: [{ rotate: '10deg' }],
  },
  scatterIcon: { position: 'absolute' },
});
