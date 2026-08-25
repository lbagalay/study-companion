import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function LaunchAnimation() {
  const palette = useAppTheme();

  const [visible, setVisible] = useState(true);

  const [backdropOpacity] = useState(() => new Animated.Value(1));

  const [logoOpacity] = useState(() => new Animated.Value(0));

  const [logoScale] = useState(() => new Animated.Value(0.76));

  const [logoY] = useState(() => new Animated.Value(16));

  const [copyOpacity] = useState(() => new Animated.Value(0));

  const [copyY] = useState(() => new Animated.Value(10));

  const [sparkleScale] = useState(() => new Animated.Value(0.4));

  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    let mounted = true;

    let animation: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) {
        return;
      }

      if (reduceMotion) {
        setVisible(false);
        return;
      }

      animation = Animated.sequence([
        Animated.parallel([
          Animated.timing(logoOpacity, {
            duration: 260,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver,
          }),

          Animated.spring(logoScale, {
            damping: 12,
            mass: 0.7,
            stiffness: 135,
            toValue: 1,
            useNativeDriver,
          }),

          Animated.timing(logoY, {
            duration: 440,
            easing: Easing.out(Easing.cubic),
            toValue: 0,
            useNativeDriver,
          }),
        ]),

        Animated.parallel([
          Animated.timing(copyOpacity, {
            duration: 260,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver,
          }),

          Animated.timing(copyY, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
            toValue: 0,
            useNativeDriver,
          }),

          Animated.spring(sparkleScale, {
            damping: 9,
            stiffness: 160,
            toValue: 1,
            useNativeDriver,
          }),
        ]),

        Animated.delay(420),

        Animated.timing(backdropOpacity, {
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver,
        }),
      ]);

      animation.start(({ finished }) => {
        if (finished && mounted) {
          setVisible(false);
        }
      });
    });

    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [
    backdropOpacity,
    copyOpacity,
    copyY,
    logoOpacity,
    logoScale,
    logoY,
    sparkleScale,
    useNativeDriver,
  ]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.backdrop,
        {
          backgroundColor: palette.background,
          opacity: backdropOpacity,
        },
      ]}
    >
      <View
        style={[
          styles.glow,
          {
            backgroundColor: palette.accentSoft,
          },
        ]}
      />

      <View
        style={[
          styles.blueGlow,
          {
            backgroundColor: palette.lavenderSoft,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [
              {
                translateY: logoY,
              },
              {
                scale: logoScale,
              },
            ],
          },
        ]}
      >
        <View style={styles.logoCrop}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={require('../../../assets/images/newicon.png')}
            style={styles.logo}
          />
        </View>

        <Animated.View
          style={[
            styles.sparkle,
            {
              backgroundColor: palette.surface,
              transform: [
                {
                  scale: sparkleScale,
                },
              ],
            },
          ]}
        >
          <Ionicons color={palette.accentStrong} name="heart" size={18} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.copy,
          {
            opacity: copyOpacity,
            transform: [
              {
                translateY: copyY,
              },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color: palette.text,
            },
          ]}
        >
          Study Companion
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: palette.textMuted,
            },
          ]}
        >
          Plan gently. Learn confidently.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    overflow: 'hidden',
    pointerEvents: 'auto',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },

  glow: {
    borderRadius: radii.pill,
    height: 330,
    opacity: 0.78,
    pointerEvents: 'none',
    position: 'absolute',
    width: 330,
  },

  blueGlow: {
    borderRadius: radii.pill,
    height: 220,
    opacity: 0.48,
    pointerEvents: 'none',
    position: 'absolute',
    transform: [
      {
        translateX: 120,
      },
      {
        translateY: 90,
      },
    ],
    width: 220,
  },

  logoWrap: {
    marginBottom: spacing.lg,
  },

  logoCrop: {
    borderRadius: 28,
    height: 128,
    overflow: 'hidden',
    width: 128,
  },

  logo: {
    height: 128,
    transform: [
      {
        scale: 1.05,
      },
    ],
    width: 128,
  },

  sparkle: {
    alignItems: 'center',
    borderRadius: radii.pill,
    bottom: -6,
    boxShadow: '0 8px 22px rgba(14, 27, 72, 0.18)',
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    width: 40,
  },

  copy: {
    alignItems: 'center',
    gap: spacing.xs,
  },

  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 30,
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
});
