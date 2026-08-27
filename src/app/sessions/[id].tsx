import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { confirmDestructive } from '@/lib/confirm';
import { z } from 'zod';
import { DateTimeField } from '@/components/forms/DateTimeField';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { keys } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { cancelNotifications, scheduleReminders } from '@/lib/notifications';
import { deleteRecord, getSession, saveSession } from '@/services';
import type { StudySession, StudySessionStatus } from '@/types';

const statuses: { label: string; value: StudySessionStatus }[] = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED',
].map((v) => ({ label: v.replace('_', ' '), value: v as StudySessionStatus }));
const optionalMinutes = z
  .string()
  .refine(
    (v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 1440),
    'Enter 0–1440 minutes.',
  );
const schema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, 'Enter a study topic.')
    .max(300, 'Keep the topic under 300 characters.'),
  plannedAt: z.string().datetime({ message: 'Choose a valid date.', offset: true }),
  duration: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 5 && Number(v) <= 480,
      'Enter 5–480 minutes.',
    ),
  actual: optionalMinutes,
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']),
  notes: z.string().max(3000, 'Keep notes under 3,000 characters.'),
});
type Values = z.infer<typeof schema>;
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useQuery({ queryKey: ['session', id], queryFn: () => getSession(id) });
  if (item.error)
    return (
      <FeedbackState
        actionLabel="Try again"
        message={item.error.message}
        onAction={() => void item.refetch()}
        title="Could not load session"
      />
    );
  if (item.isLoading || !item.data)
    return <FeedbackState loading message="Loading study session." title="One moment" />;
  return <SessionEditor item={item.data} key={item.data.updated_at} />;
}

function SessionEditor({ item }: { item: StudySession }) {
  const router = useRouter();
  const client = useQueryClient();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      topic: item.topic,
      plannedAt: item.planned_at,
      duration: String(item.planned_duration),
      actual: item.actual_duration == null ? '' : String(item.actual_duration),
      status: item.status,
      notes: item.notes,
    },
  });
  const save = useMutation({
    mutationFn: async (v: Values) => {
      await cancelNotifications(item.notification_id ? [item.notification_id] : []);
      const ids = ['PLANNED', 'IN_PROGRESS'].includes(v.status)
        ? await scheduleReminders(
            v.topic,
            'Your study session starts in 15 minutes.',
            v.plannedAt,
            [15],
          )
        : [];
      return saveSession(
        {
          subject_id: item.subject_id,
          topic: v.topic,
          planned_at: v.plannedAt,
          planned_duration: Number(v.duration),
          actual_duration: v.actual ? Number(v.actual) : null,
          status: v.status,
          notes: v.notes,
          notification_id: ids[0] ?? null,
        },
        item.id,
      );
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.sessions });
      router.back();
    },
    onError: (e) => Alert.alert('Could not save session', getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async () => {
      await cancelNotifications(item.notification_id ? [item.notification_id] : []);
      return deleteRecord('study_sessions', item.id);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.sessions });
      router.back();
    },
    onError: (e) => Alert.alert('Could not delete session', getErrorMessage(e)),
  });
  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Record what happened and keep the plan realistic."
        title="Study session"
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="topic"
          render={({ field }) => (
            <FormField
              error={errors.topic?.message}
              label="Topic"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="plannedAt"
          render={({ field }) => (
            <DateTimeField
              label="Planned date and time"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="duration"
          render={({ field }) => (
            <FormField
              error={errors.duration?.message}
              keyboardType="number-pad"
              label="Planned minutes"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="actual"
          render={({ field }) => (
            <FormField
              error={errors.actual?.message}
              keyboardType="number-pad"
              label="Actual minutes"
              onChangeText={field.onChange}
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
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <FormField label="Notes" multiline onChangeText={field.onChange} value={field.value} />
          )}
        />
        <AppButton
          label="Save session"
          loading={save.isPending}
          onPress={handleSubmit((v) => save.mutate(v))}
        />
        <AppButton
          label="Delete session"
          loading={remove.isPending}
          onPress={() =>
            confirmDestructive('Delete session?', 'This cannot be undone.', () => remove.mutate())
          }
          variant="danger"
        />
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl } });
