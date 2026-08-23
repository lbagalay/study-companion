import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  radii,
  spacing,
  typography,
} from '@/constants/theme';

import { useAppTheme } from '@/hooks/useAppTheme';

type ScreenHeaderProps =
  PropsWithChildren<{
    back?: boolean;
    description?: string;
    onBack?: () => void;
    title: string;
  }>;

export function ScreenHeader({
  back = false,
  children,
  description,
  onBack,
  title,
}: ScreenHeaderProps) {
  const router = useRouter();
  const palette = useAppTheme();

  const handleBack = () => {
    /*
     * Allow an individual screen to provide
     * its own back behavior if needed.
     */
    if (onBack) {
      onBack();
      return;
    }

    /*
     * If there is an actual navigation entry,
     * use normal back navigation.
     */
    if (router.canGoBack()) {
      router.back();
      return;
    }

    /*
     * Fallback for:
     * - refreshed pages
     * - direct URLs
     * - opened PDF links
     * - restored browser sessions
     *
     * This prevents:
     *
     * "The action 'GO_BACK' was not handled
     * by any navigator."
     */
    router.replace('/home');
  };

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        {back ? (
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor:
                  palette.surface,
                borderColor:
                  palette.border,
                opacity: pressed
                  ? 0.65
                  : 1,
              },
            ]}
          >
            <Ionicons
              color={
                palette.accentStrong
              }
              name="arrow-back"
              size={21}
            />
          </Pressable>
        ) : null}

        <View style={styles.copy}>
          <Text
            style={[
              styles.title,
              {
                color:
                  palette.text,
              },
            ]}
          >
            {title}
          </Text>

          {description ? (
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
          ) : null}
        </View>

        {children ? (
          <View
            style={
              styles.actions
            }
          >
            {children}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom:
      spacing.lg,
    width: '100%',
  },

  topRow: {
    alignItems:
      'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },

  backButton: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    borderWidth: 1,
    flexShrink: 0,
    height: 42,
    justifyContent:
      'center',
    marginTop: 3,
    width: 42,
  },

  copy: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    ...typography.title,
    fontSize: 30,
    lineHeight: 36,
  },

  description: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop:
      spacing.xs,
  },

  actions: {
    alignItems:
      'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: spacing.sm,
  },
});