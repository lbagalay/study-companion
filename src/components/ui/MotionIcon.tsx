import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet } from 'react-native';

type Props = {
  backgroundColor: string;
  color: string;
  iconSize?: number;
  loop?: boolean;
  name: ComponentProps<typeof Ionicons>['name'];
  size?: number;
};

export function MotionIcon({
  backgroundColor,
  color,
  iconSize = 20,
  loop = false,
  name,
  size = 42,
}: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;
      if (reduceMotion) {
        progress.setValue(1);
        return;
      }
      if (loop) {
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(progress, {
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              toValue: 1,
              useNativeDriver,
            }),
            Animated.timing(progress, {
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              toValue: 0,
              useNativeDriver,
            }),
          ]),
        );
      } else {
        animation = Animated.spring(progress, {
          damping: 9,
          mass: 0.65,
          stiffness: 150,
          toValue: 1,
          useNativeDriver,
        });
      }
      animation.start();
    });
    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [loop, progress, useNativeDriver]);

  const scale = loop
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })
    : progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] });
  const translateY = loop
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] })
    : progress.interpolate({ inputRange: [0, 1], outputRange: [5, 0] });

  return (
    <Animated.View
      style={[
        styles.icon,
        {
          backgroundColor,
          height: size,
          opacity: loop ? 1 : progress,
          transform: [{ translateY }, { scale }],
          width: size,
        },
      ]}
    >
      <Ionicons color={color} name={name} size={iconSize} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', borderRadius: 999, justifyContent: 'center' },
});
