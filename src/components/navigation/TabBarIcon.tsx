import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { brand } from '@/constants/theme';

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
        Animated.spring(scale, { damping: 8, stiffness: 220, toValue: 1.16, useNativeDriver }),
        Animated.spring(scale, { damping: 9, stiffness: 180, toValue: 1, useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(lift, { duration: 150, toValue: -2, useNativeDriver }),
        Animated.spring(lift, { damping: 9, stiffness: 180, toValue: 0, useNativeDriver }),
      ]),
    ]).start();
  }, [focused, lift, scale]);
  return <Animated.View style={[styles.wrap, focused && styles.focused, { backgroundColor: focused ? brand.mauve : 'transparent', transform: [{ translateY: lift }, { scale }] }]}><Ionicons color={color} name={focused ? name : (`${name}-outline` as IoniconName)} size={Math.min(size, focused ? 19 : 20)} /></Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', borderRadius: 999, height: 30, justifyContent: 'center', width: 30 },
  focused: { borderColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, boxShadow: '0 4px 10px rgba(193, 141, 180, 0.28)', elevation: 2 },
});
