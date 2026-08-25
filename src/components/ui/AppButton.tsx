import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = Omit<ComponentProps<typeof Pressable>, 'children' | 'style'> & {
  icon?: ComponentProps<typeof Ionicons>['name'];
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export function AppButton({
  accessibilityLabel,
  accessibilityState,
  disabled,
  icon,
  label,
  loading = false,
  onPress,
  onPressIn,
  onPressOut,
  style,
  variant = 'primary',
  ...props
}: Props) {
  const palette = useAppTheme();
  const [scale] = useState(() => new Animated.Value(1));
  const fillColor =
    variant === 'primary'
      ? palette.accentSolid
      : variant === 'danger'
        ? palette.danger
        : variant === 'ghost'
          ? 'transparent'
          : palette.accentSoft;
  const textColor =
    variant === 'danger' ? '#FFFFFF' : variant === 'primary' ? palette.text : palette.accentStrong;
  const animateScale = (toValue: number) =>
    Animated.spring(scale, {
      damping: 12,
      mass: 0.45,
      stiffness: 220,
      toValue,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  return (
    <Animated.View style={[styles.motion, style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{
          ...accessibilityState,
          busy: loading,
          disabled: Boolean(disabled || loading),
        }}
        disabled={disabled || loading}
        onPress={(event) => {
          if (Platform.OS !== 'web') void Haptics.selectionAsync();
          onPress?.(event);
        }}
        onPressIn={(event) => {
          animateScale(0.96);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateScale(1);
          onPressOut?.(event);
        }}
        style={({ pressed }) => [
          styles.button,
          variant === 'primary' && styles.primaryShadow,
          {
            backgroundColor: variant === 'primary' ? 'transparent' : fillColor,
            borderColor: variant === 'secondary' ? palette.border : fillColor,
            opacity: disabled || loading ? 0.5 : pressed ? 0.86 : 1,
          },
        ]}
        {...props}
      >
        {variant === 'primary' ? (
          <LinearGradient
            colors={[palette.accentSoft, palette.accentSolid]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            {icon ? <Ionicons color={textColor} name={icon} size={17} /> : null}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  motion: { alignSelf: 'stretch' },
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  primaryShadow: { boxShadow: '0 10px 24px rgba(193, 141, 180, 0.32)' },
  label: { ...typography.label, fontSize: 12 },
});
