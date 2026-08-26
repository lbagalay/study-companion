import { usePathname } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/useAppTheme';

import { BearAvatar } from './BearAvatar';
import { useAssistant } from './AssistantProvider';

/** Main tab roots where the floating bottom tab bar is also on screen. */
const TAB_ROUTES = new Set(['/home', '/schedule', '/tasks', '/study', '/profile']);

export function AssistantButton() {
  const { visible, open, openSheet } = useAssistant();
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (!visible || open) return null;

  const onTabScreen = TAB_ROUTES.has(pathname);
  const bottom = onTabScreen ? Math.max(10, insets.bottom) + 86 : Math.max(20, insets.bottom + 20);

  return (
    <Pressable
      accessibilityLabel="Open Study Assistant"
      accessibilityRole="button"
      onPress={openSheet}
      style={[
        styles.button,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          bottom,
        },
      ]}
    >
      <BearAvatar size={52} variant="button" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0 10px 24px rgba(14, 27, 72, 0.18)',
    justifyContent: 'center',
    padding: 4,
    position: 'absolute',
    right: 18,
    zIndex: 900,
  },
});
