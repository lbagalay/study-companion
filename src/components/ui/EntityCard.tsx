import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  accent?: string;
  badge?: string;
  metadata?: string;
  onPress?: () => void;
  subtitle?: string;
  title: string;
};
export function EntityCard({ accent, badge, metadata, onPress, subtitle, title }: Props) {
  const palette = useAppTheme();
  const [entrance] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let mounted = true;
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted || reduceMotion) {
        entrance.setValue(1);
        return;
      }
      animation = Animated.timing(entrance, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
      });
      animation.start();
    });
    return () => {
      mounted = false;
      animation?.stop();
    };
  }, [entrance]);
  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        ],
      }}
    >
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            opacity: pressed ? 0.78 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        <View style={[styles.cornerWash, { backgroundColor: accent ?? palette.accent }]} />
        <View style={[styles.accent, { backgroundColor: accent ?? palette.accent }]}>
          <Ionicons color={palette.surface} name="sparkles" size={12} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text>
          ) : null}
          {metadata ? (
            <Text style={[styles.metadata, { color: palette.textMuted }]}>{metadata}</Text>
          ) : null}
        </View>
        <View style={styles.trailing}>
          {badge ? (
            <Text
              style={[
                styles.badge,
                { backgroundColor: palette.accentSoft, color: palette.accentStrong },
              ]}
            >
              {badge}
            </Text>
          ) : null}
          <Ionicons color={palette.textMuted} name="chevron-forward" size={18} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: '0 10px 28px rgba(14, 27, 72, 0.07)',
    flexDirection: 'row',
    gap: spacing.md,
    overflow: 'hidden',
    padding: 17,
  },
  cornerWash: {
    borderRadius: radii.pill,
    height: 96,
    opacity: 0.08,
    position: 'absolute',
    right: -38,
    top: -34,
    width: 96,
  },
  accent: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  copy: { flex: 1, gap: spacing.xs },
  title: { ...typography.sectionTitle, fontSize: 19, lineHeight: 24 },
  subtitle: { ...typography.body, fontSize: 14, lineHeight: 20 },
  metadata: typography.caption,
  badge: {
    ...typography.label,
    borderRadius: radii.pill,
    fontSize: 9,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  trailing: { alignItems: 'center', flexDirection: 'row', gap: 5 },
});
