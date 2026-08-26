import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = {
  onSend: (text: string) => void;
  sending: boolean;
};

export function AssistantComposer({ onSend, sending }: Props) {
  const palette = useAppTheme();
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <TextInput
        accessibilityLabel="Ask the Study Assistant"
        multiline
        onChangeText={setValue}
        onSubmitEditing={submit}
        placeholder="Ask something..."
        placeholderTextColor={palette.textMuted}
        returnKeyType="send"
        style={[styles.input, { color: palette.text }]}
        value={value}
      />

      <Pressable
        accessibilityLabel="Send"
        accessibilityRole="button"
        disabled={sending || !value.trim()}
        onPress={submit}
        style={[
          styles.sendButton,
          {
            backgroundColor: palette.accentSolid,
            opacity: sending || !value.trim() ? 0.5 : 1,
          },
        ]}
      >
        {sending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons color="#FFFFFF" name="arrow-up" size={18} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
