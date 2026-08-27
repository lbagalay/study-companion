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
import { cancelNotifications, scheduleExamReminders } from '@/lib/notifications';
import { deleteRecord, getExam, saveExam, updateExam } from '@/services';
import type { ExamStatus, ExamType } from '@/types';

const types: {
  label: string;
  value: ExamType;
}[] = ['QUIZ', 'EXAM', 'MIDTERM', 'FINAL', 'PRACTICAL', 'PRESENTATION', 'OTHER'].map((value) => ({
  label: value,
  value: value as ExamType,
}));

const statuses: {
  label: string;
  value: ExamStatus;
}[] = ['UPCOMING', 'COMPLETED', 'CANCELLED'].map((value) => ({
  label: value,
  value: value as ExamStatus,
}));

const reminderChoices = reminderOffsetChoices([20160, 10080, 4320, 1440, 180]);

const schema = z.object({
  subject_id: z.string().min(1, 'Choose a subject.'),

  title: z
    .string()
    .trim()
    .min(1, 'Enter an exam title.')
    .max(150, 'Keep the title under 150 characters.'),

  type: z.enum(['QUIZ', 'EXAM', 'MIDTERM', 'FINAL', 'PRACTICAL', 'PRESENTATION', 'OTHER']),

  exam_at: z.string().datetime({ message: 'Choose a valid exam date.', offset: true }),

  room: z.string().trim().max(50, 'Keep the room under 50 characters.'),

  coverage: z.string().trim().max(5000, 'Keep coverage under 5,000 characters.'),

  notes: z.string().trim().max(3000, 'Keep notes under 3,000 characters.'),

  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED']),

  reminder_offsets: z.array(z.number().int().positive()).min(1, 'Choose at least one reminder.'),
});

type Values = z.infer<typeof schema>;

export function ExamForm({ id }: { id?: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const subjects = useSubjects();

  const item = useQuery({
    queryKey: ['exam', id],
    queryFn: () => getExam(id!),
    enabled: Boolean(id),
  });

  useAssistantScreenContext(
    useMemo(
      () => ({
        type: 'assessment',
        id,
        label: item.data?.title ?? (id ? 'Assessment' : 'New assessment'),
      }),
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
      title: '',
      type: 'EXAM',
      exam_at: addDays(new Date(), 7).toISOString(),
      room: '',
      coverage: '',
      notes: '',
      status: 'UPCOMING',
      reminder_offsets: [10080, 4320, 1440],
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
      type: item.data.type,
      exam_at: item.data.exam_at,
      room: item.data.room,
      coverage: item.data.coverage,
      notes: item.data.notes,
      status: item.data.status,
      reminder_offsets: item.data.reminder_offsets,
    });
  }, [item.data, reset]);

  const save = useMutation({
    mutationFn: async (values: Values) => {
      await cancelNotifications(item.data?.notification_ids ?? []);

      const saved = await saveExam(
        {
          ...values,
          notification_ids: [],
        },
        id,
      );

      if (values.status !== 'UPCOMING') {
        return saved;
      }

      const notificationIds = await scheduleExamReminders(
        values.title,
        values.exam_at,
        values.reminder_offsets,
      );

      return updateExam(saved!.id, {
        notification_ids: notificationIds,
      });
    },

    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey: keys.exams,
        }),

        id
          ? client.invalidateQueries({
              queryKey: ['exam', id],
            })
          : Promise.resolve(),
      ]);

      router.back();
    },

    onError: (error) => {
      const message = getErrorMessage(error);

      if (Platform.OS === 'web') {
        window.alert(`Could not save exam or quiz\n\n${message}`);
      } else {
        Alert.alert('Could not save exam or quiz', message);
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!id) {
        return;
      }

      await cancelNotifications(item.data?.notification_ids ?? []);

      await deleteRecord('exams', id);
    },

    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: keys.exams,
      });

      if (id) {
        client.removeQueries({
          queryKey: ['exam', id],
        });
      }

      router.back();
    },

    onError: (error) => {
      const message = getErrorMessage(error);

      if (Platform.OS === 'web') {
        window.alert(`Could not delete exam or quiz\n\n${message}`);
      } else {
        Alert.alert('Could not delete exam or quiz', message);
      }
    },
  });

  const confirmDelete = () => {
    if (!id) {
      return;
    }

    confirmDestructive(
      'Delete exam or quiz?',
      'Related study sessions will remain but lose this exam link. This cannot be undone.',
      () => remove.mutate(),
    );
  };

  if (id && item.error) {
    return (
      <FeedbackState
        actionLabel="Try again"
        message={getErrorMessage(item.error)}
        onAction={() => void item.refetch()}
        title="Could not load exam"
      />
    );
  }

  if (id && item.isLoading) {
    return <FeedbackState loading message="Loading exam." title="One moment" />;
  }

  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Coverage becomes the basis of a study plan."
        title={id ? 'Exam details' : 'New exam'}
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

        <FieldRow>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <ChoiceField
                choices={types}
                label="Type"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />

          <Controller
            control={control}
            name="room"
            render={({ field }) => (
              <FormField label="Room" onChangeText={field.onChange} value={field.value} />
            )}
          />
        </FieldRow>

        <Controller
          control={control}
          name="exam_at"
          render={({ field }) => (
            <DateTimeField
              error={errors.exam_at?.message}
              label="Exam or quiz date and time"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="coverage"
          render={({ field }) => (
            <FormField
              label="Coverage (one topic per line)"
              multiline
              onChangeText={field.onChange}
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

        <AppButton
          icon={id ? 'checkmark-circle-outline' : 'add-circle-outline'}
          label={id ? 'Save changes' : 'Add exam or quiz'}
          loading={save.isPending}
          onPress={handleSubmit((values) => save.mutate(values))}
        />

        {id ? (
          <AppButton
            icon="trash-outline"
            label="Delete exam or quiz"
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
