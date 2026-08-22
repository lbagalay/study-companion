import type { ComponentProps } from 'react';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = Omit<ComponentProps<typeof Pressable>, 'children' | 'style'> & { label: string; loading?: boolean; style?: StyleProp<ViewStyle>; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' };

export function AppButton({ disabled, label, loading = false, onPress, style, variant = 'primary', ...props }: Props) {
  const palette = useAppTheme();
  const backgroundColor = variant === 'primary' ? palette.accentSolid : variant === 'danger' ? palette.danger : variant === 'ghost' ? 'transparent' : palette.accentSoft;
  const textColor = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : palette.accentStrong;
  return (
    <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={(event) => { if (Platform.OS !== 'web') void Haptics.selectionAsync(); onPress?.(event); }} style={({ pressed }) => [styles.button, variant === 'primary' && styles.primaryShadow, { backgroundColor, borderColor: variant === 'secondary' ? palette.border : backgroundColor, opacity: disabled || loading ? 0.5 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]} {...props}>
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', borderRadius: radii.md, borderWidth: 1, minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryShadow: { boxShadow: '0 8px 18px rgba(207, 67, 80, 0.20)' },
  label: { ...typography.sectionTitle, fontSize: 17 },
});
