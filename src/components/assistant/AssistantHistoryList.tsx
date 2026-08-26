import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { listConversations } from '@/services/assistant';

type Conversation = { id: string; title: string; updated_at: string };

type Props = {
  onSelect: (id: string) => void;
};

export function AssistantHistoryList({ onSelect }: Props) {
  const palette = useAppTheme();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    listConversations()
      .then((rows) => {
        if (mounted) setConversations(rows);
      })
      .catch((err: unknown) => {
        if (mounted) setError(getErrorMessage(err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.state}>
        <Text style={[styles.stateText, { color: palette.danger }]}>{error}</Text>
      </View>
    );
  }

  if (!conversations) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (!conversations.length) {
    return (
      <View style={styles.state}>
        <Text style={[styles.stateText, { color: palette.textMuted }]}>
          Your conversations with the Study Assistant will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {conversations.map((conversation) => (
        <Pressable
          accessibilityRole="button"
          key={conversation.id}
          onPress={() => onSelect(conversation.id)}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.rowCopy}>
            <Text numberOfLines={1} style={[styles.rowTitle, { color: palette.text }]}>
              {conversation.title || 'Untitled conversation'}
            </Text>
            <Text style={[styles.rowMeta, { color: palette.textMuted }]}>
              {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
            </Text>
          </View>

          <Ionicons color={palette.textMuted} name="chevron-forward" size={16} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  stateText: {
    ...typography.body,
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    ...typography.label,
    fontSize: 13,
    textTransform: 'none',
  },
  rowMeta: {
    ...typography.caption,
    fontSize: 10,
  },
});
