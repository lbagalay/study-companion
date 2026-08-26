import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { keys } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import type { AssistantActionProposal } from '@/lib/ai/types';
import { updateAssignment } from '@/services';

import { useAssistant } from './AssistantProvider';

type Status = 'pending' | 'loading' | 'done' | 'error';

/**
 * Renders a proposed write action with explicit Cancel/Confirm buttons.
 * Nothing is saved until Confirm is tapped — and even then, the mutation
 * runs through the app's own existing, RLS-protected service functions
 * (`updateAssignment`) or the app's own reviewed creation form, never a
 * direct write from the model or a bespoke new write path.
 */
export function AssistantActionCard({
  action,
  messageId,
}: {
  action: AssistantActionProposal;
  messageId: string;
}) {
  const palette = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearMessageAction, closeSheet } = useAssistant();
  const [status, setStatus] = useState<Status>('pending');
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setStatus('done');
    clearMessageAction(messageId);
  };

  const confirm = async () => {
    setStatus('loading');
    setError(null);

    try {
      if (action.type === 'MARK_TASK_COMPLETE') {
        await updateAssignment(action.taskId, {
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: keys.assignments }),
          queryClient.invalidateQueries({ queryKey: ['assignment', action.taskId] }),
        ]);

        setStatus('done');
        clearMessageAction(messageId);

        return;
      }

      // CREATE_TASK: open the app's own creation form pre-filled, rather than
      // inserting directly — the student still reviews subject/priority/
      // reminders and taps the form's own Save button before anything exists.
      closeSheet();
      router.push({
        pathname: '/assignments/create',
        params: {
          title: action.title,
          ...(action.dueAt ? { dueAt: action.dueAt } : {}),
          ...(action.notes ? { notes: action.notes } : {}),
        },
      });

      setStatus('done');
      clearMessageAction(messageId);
    } catch (mutationError) {
      setStatus('error');
      setError(getErrorMessage(mutationError));
    }
  };

  if (status === 'done') return null;

  return (
    <View
      style={[styles.card, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{action.label}</Text>

      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          disabled={status === 'loading'}
          onPress={cancel}
          style={[styles.button, { borderColor: palette.border }]}
        >
          <Text style={[styles.buttonText, { color: palette.textMuted }]}>Cancel</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={status === 'loading'}
          onPress={() => void confirm()}
          style={[styles.button, styles.confirmButton, { backgroundColor: palette.accentSolid }]}
        >
          {status === 'loading' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {action.type === 'CREATE_TASK' ? 'Review & create' : 'Confirm'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  label: {
    ...typography.body,
    fontSize: 13,
  },
  error: {
    ...typography.caption,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: spacing.xs,
  },
  confirmButton: {
    borderWidth: 0,
  },
  buttonText: {
    ...typography.label,
    fontSize: 12,
    textTransform: 'none',
  },
});
