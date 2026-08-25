import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert`'s button callbacks never fire on react-native-web (its
 * `Alert.alert` is a no-op), so every destructive confirmation needs a
 * `window.confirm` fallback on web. Route all of them through here so
 * that fallback can't be forgotten at a new call site.
 */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete',
) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { style: 'cancel', text: 'Cancel' },
    { onPress: onConfirm, style: 'destructive', text: confirmLabel },
  ]);
}
