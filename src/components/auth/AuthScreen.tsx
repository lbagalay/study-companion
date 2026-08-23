import type { PropsWithChildren } from 'react';

import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';

import {
  radii,
  spacing,
  typography,
} from '@/constants/theme';

import { useAppTheme } from '@/hooks/useAppTheme';

export function AuthScreen({
  children,
  description,
  title,
}: PropsWithChildren<{
  description: string;
  title: string;
}>) {
  const palette = useAppTheme();
  const { width } = useWindowDimensions();

  const compact = width < 600;

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={[
          styles.container,
          compact && styles.containerCompact,
        ]}
      >
        {/* Decorative background */}
        <View
          pointerEvents="none"
          style={[
            styles.glowLarge,
            {
              backgroundColor:
                palette.accentSoft,
            },
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.glowSmall,
            {
              backgroundColor:
                palette.lavenderSoft,
            },
          ]}
        />

        <View
          pointerEvents="none"
          style={[
            styles.glowDot,
            {
              backgroundColor:
                palette.accent,
            },
          ]}
        />

        {/* Main auth card */}
        <View
          style={[
            styles.card,
            compact && styles.cardCompact,
            {
              backgroundColor:
                palette.surface,
              borderColor:
                palette.border,
            },
          ]}
        >
          {/* Thin brand ribbon */}
          <View
            style={[
              styles.ribbon,
              {
                backgroundColor:
                  palette.accentSoft,
              },
            ]}
          />

          <View style={styles.header}>
            {/* Logo */}
            <View
              style={[
                styles.logoShell,
                {
                  backgroundColor:
                    palette.accentSoft,
                  borderColor:
                    palette.border,
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
            </View>

            {/* Brand */}
            <Text
              style={[
                styles.brand,
                {
                  color:
                    palette.accentStrong,
                },
              ]}
            >
              STUDY COMPANION
            </Text>

            {/* Heading */}
            <Text
              style={[
                styles.title,
                {
                  color: palette.text,
                },
              ]}
            >
              {title}
            </Text>

            {/* Supporting copy */}
            <Text
              style={[
                styles.description,
                {
                  color:
                    palette.textMuted,
                },
              ]}
            >
              {description}
            </Text>
          </View>

          <View
            style={[
              styles.formArea,
              {
                borderTopColor:
                  palette.border,
              },
            ]}
          >
            {children}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerWrap}>
          <View
            style={[
              styles.footerLine,
              {
                backgroundColor:
                  palette.border,
              },
            ]}
          />

          <Text
            style={[
              styles.footer,
              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            Plan gently. Learn confidently.
          </Text>

          <View
            style={[
              styles.footerLine,
              {
                backgroundColor:
                  palette.border,
              },
            ]}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 640,
    minHeight: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    position: 'relative',
    width: '100%',
  },

  containerCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
  },

  card: {
    borderRadius: 32,
    borderWidth: 1,
    boxShadow:
      '0 24px 70px rgba(14, 27, 72, 0.12)',
    overflow: 'hidden',
    paddingBottom: 30,
    paddingHorizontal: 32,
    paddingTop: 30,
    position: 'relative',
    width: '100%',
  },

  cardCompact: {
    borderRadius: 26,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  ribbon: {
    height: 7,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  header: {
    alignItems: 'center',
    paddingBottom: 26,
  },

  logoShell: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    height: 82,
    justifyContent: 'center',
    marginBottom: 14,
    width: 82,
  },

  logoCrop: {
    borderRadius: 18,
    height: 68,
    overflow: 'hidden',
    width: 68,
  },

  logo: {
    height: 68,
    transform: [
      {
        scale: 1.05,
      },
    ],
    width: 68,
  },

  brand: {
    ...typography.label,
    fontSize: 12,
    letterSpacing: 1.7,
    marginBottom: 8,
  },

  title: {
    ...typography.title,
    fontSize: 38,
    letterSpacing: -0.8,
    lineHeight: 44,
    textAlign: 'center',
  },

  description: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    maxWidth: 420,
    textAlign: 'center',
  },

  formArea: {
    borderTopWidth: 1,
    gap: 14,
    paddingTop: 24,
  },

  footerWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: spacing.lg,
  },

  footerLine: {
    height: 1,
    maxWidth: 64,
    opacity: 0.7,
    width: 44,
  },

  footer: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
  },

  glowLarge: {
    borderRadius: radii.pill,
    height: 300,
    opacity: 0.42,
    position: 'absolute',
    right: -130,
    top: 20,
    width: 300,
  },

  glowSmall: {
    borderRadius: radii.pill,
    bottom: 40,
    height: 190,
    left: -92,
    opacity: 0.38,
    position: 'absolute',
    width: 190,
  },

  glowDot: {
    borderRadius: radii.pill,
    height: 7,
    opacity: 0.65,
    position: 'absolute',
    right: 22,
    top: 56,
    width: 7,
  },
});