import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabBarIconProps = {
  color: ComponentProps<typeof Ionicons>['color'];
  focused: boolean;
  name: IoniconName;
  size: number;
};

export function TabBarIcon({ color, focused, name, size }: TabBarIconProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!focused) return;
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, { damping: 8, stiffness: 220, toValue: 1.28, useNativeDriver }),
        Animated.spring(scale, { damping: 9, stiffness: 180, toValue: 1, useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(lift, { duration: 150, toValue: -3, useNativeDriver }),
        Animated.spring(lift, { damping: 9, stiffness: 180, toValue: 0, useNativeDriver }),
      ]),
    ]).start();
  }, [focused, lift, scale]);
  return <View style={styles.wrap}>{focused ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}<Animated.View style={{ transform: [{ translateY: lift }, { scale }] }}><Ionicons color={color} name={focused ? name : (`${name}-outline` as IoniconName)} size={size} /></Animated.View></View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  dot: { borderRadius: 999, height: 4, position: 'absolute', right: -5, top: -2, width: 4 },
});
