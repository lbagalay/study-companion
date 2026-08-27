import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { useAssistantScreenContext } from '@/components/assistant/AssistantProvider';
import { DateTimeField } from '@/components/forms/DateTimeField';
import { SubjectField } from '@/components/forms/SubjectField';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FieldRow } from '@/components/ui/FieldRow';
import { FormField } from '@/components/ui/FormField';
import { MultiChoiceField } from '@/components/ui/MultiChoiceField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { reminderOffsetChoices } from '@/constants/reminders';
import { spacing } from '@/constants/theme';
import { keys, useSubjects } from '@/hooks/useStudyData';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { cancelNotifications, scheduleReminders } from '@/lib/notifications';
import { deleteRecord, getAssignment, saveAssignment, updateAssignment } from '@/services';
import type { AssignmentPriority, AssignmentStatus } from '@/types';

const priorities: {
  label: string;
  value: AssignmentPriority;
}[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({
  label: value,
  value: value as AssignmentPriority,
}));

const statuses: {
  label: string;
  value: AssignmentStatus;
}[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((value) => ({
  label: value.replace('_', ' '),
  value: value as AssignmentStatus,
}));

const reminderChoices = reminderOffsetChoices([10080, 4320, 1440, 180, 60]);

const schema = z.object({
  subject_id: z.string().min(1, 'Choose a subject.'),

  title: z
    .string()
    .trim()
    .min(1, 'Enter an assignment title.')
    .max(150, 'Keep the title under 150 characters.'),

  description: z.string().trim().max(3000, 'Keep the description under 3,000 characters.'),

  due_at: z.string().datetime({ message: 'Choose a valid due date.', offset: true }),

  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),

  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),

  reminder_offsets: z.array(z.number().int().positive()).min(1, 'Choose at least one reminder.'),

  notes: z.string().trim().max(3000, 'Keep notes under 3,000 characters.'),
});

type Values = z.infer<typeof schema>;

type Props = {
  id?: string;
  initialTitle?: string;
  initialDueAt?: string;
  initialNotes?: string;
};

export function AssignmentForm({ id, initialTitle, initialDueAt, initialNotes }: Props) {
  const router = useRouter();
  const client = useQueryClient();
  const subjects = useSubjects();

  const item = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => getAssignment(id!),
    enabled: Boolean(id),
  });

  useAssistantScreenContext(
    useMemo(
      () => ({ type: 'task', id, label: item.data?.title ?? (id ? 'Task' : 'New task') }),
      [id, item.data?.title],
    ),
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),

    defaultValues: {
      subject_id: '',
      title: initialTitle ?? '',
      description: '',
      due_at: initialDueAt ?? addDays(new Date(), 1).toISOString(),
      priority: 'MEDIUM',
      status: 'NOT_STARTED',
      reminder_offsets: [1440, 180, 60],
      notes: initialNotes ?? '',
    },
  });

  useEffect(() => {
    if (!id && subjects.data?.[0]) {
      reset((value) => ({
        ...value,
        subject_id: value.subject_id || subjects.data![0].id,
      }));
    }
  }, [id, reset, subjects.data]);

  useEffect(() => {
    if (!item.data) {
      return;
    }

    reset({
      subject_id: item.data.subject_id,
      title: item.data.title,
      description: item.data.description,
      due_at: item.data.due_at,
      priority: item.data.priority,
      status: item.data.status,
      reminder_offsets: item.data.reminder_offsets,
      notes: item.data.notes,
    });
  }, [item.data, reset]);

  const save = useMutation({
    mutationFn: async (values: Values) => {
      await cancelNotifications(item.data?.notification_ids ?? []);

      const saved = await saveAssignment(
        {
          ...values,

          completed_at:
            values.status === 'COMPLETED'
              ? (item.data?.completed_at ?? new Date().toISOString())
              : null,

          notification_ids: [],
        },
        id,
      );

      if (values.status === 'COMPLETED' || values.status === 'CANCELLED') {
        return saved;
      }

      const notificationIds = await scheduleReminders(
        values.title,
        'An activity deadline is approaching.',
        values.due_at,
        values.reminder_offsets,
      );

      return updateAssignment(saved!.id, {
        notification_ids: notificationIds,
      });
    },

    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: keys.assignments,
        }),

        id
          ? client.invalidateQueries({
              queryKey: ['assignment', id],
            })
          : Promise.resolve(),
      ]);

      router.back();
    },

    onError: (error) => {
      const message = getErrorMessage(error);

      if (Platform.OS === 'web') {
        window.alert(`Could not save assignment\n\n${message}`);
      } else {
        Alert.alert('Could not save assignment', message);
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!id) {
        return;
      }

      await cancelNotifications(item.data?.notification_ids ?? []);

      await deleteRecord('assignments', id);
    },

    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: keys.assignments,
      });

      if (id) {
        client.removeQueries({
          queryKey: ['assignment', id],
        });
      }

      router.back();
    },

    onError: (error) => {
      const message = getErrorMessage(error);

      if (Platform.OS === 'web') {
        window.alert(`Could not delete assignment\n\n${message}`);
      } else {
        Alert.alert('Could not delete assignment', message);
      }
    },
  });

  const confirmDelete = () => {
    if (!id) {
      return;
    }

    confirmDestructive('Delete assignment?', 'This cannot be undone.', () => remove.mutate());
  };

  if (id && item.error) {
    return (
      <FeedbackState
        actionLabel="Try again"
        message={getErrorMessage(item.error)}
        onAction={() => void item.refetch()}
        title="Could not load assignment"
      />
    );
  }

  if (id && item.isLoading) {
    return <FeedbackState loading message="Loading assignment." title="One moment" />;
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Set a clear due date and priority."
        title={id ? 'Edit assignment' : 'New assignment'}
      />

      <View style={styles.form}>
        <Controller
          control={control}
          name="subject_id"
          render={({ field }) => (
            <SubjectField
              error={errors.subject_id?.message}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <FormField
              error={errors.title?.message}
              label="Title"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <FormField
              label="Description"
              multiline
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="due_at"
          render={({ field }) => (
            <DateTimeField
              error={errors.due_at?.message}
              label="Due date and time"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />

        <FieldRow>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <ChoiceField
                choices={priorities}
                label="Priority"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <ChoiceField
                choices={statuses}
                label="Status"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </FieldRow>

        <Controller
          control={control}
          name="reminder_offsets"
          render={({ field }) => (
            <MultiChoiceField
              choices={reminderChoices}
              error={errors.reminder_offsets?.message}
              label="Remind me"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <FormField label="Notes" multiline onChangeText={field.onChange} value={field.value} />
          )}
        />

        <AppButton
          icon={id ? 'checkmark-circle-outline' : 'add-circle-outline'}
          label={id ? 'Save changes' : 'Add assignment'}
          loading={save.isPending}
          onPress={handleSubmit((values) => save.mutate(values))}
        />

        {id ? (
          <AppButton
            icon="trash-outline"
            label="Delete assignment"
            loading={remove.isPending}
            onPress={confirmDelete}
            variant="danger"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
