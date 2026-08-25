import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, set } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { confirmDestructive } from '@/lib/confirm';
import { z } from 'zod';
import { DateTimeField } from '@/components/forms/DateTimeField';
import { SubjectField } from '@/components/forms/SubjectField';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FieldRow } from '@/components/ui/FieldRow';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { keys, useSubjects } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { deleteRecord, getSchedule, saveSchedule } from '@/services';

export const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const schema = z
  .object({
    subject_id: z.string().min(1),
    day_of_week: z.number().min(0).max(6),
    start: z.string(),
    end: z.string(),
    room: z.string().trim().max(50),
  })
  .refine((v) => new Date(v.end) > new Date(v.start), {
    path: ['end'],
    message: 'End time must be after start time.',
  });
type Values = z.infer<typeof schema>;
const atTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 }).toISOString();
};

export function ScheduleForm({ id }: { id?: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const subjects = useSubjects();
  const item = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => getSchedule(id!),
    enabled: Boolean(id),
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject_id: '',
      day_of_week: new Date().getDay(),
      start: atTime('08:00'),
      end: atTime('09:00'),
      room: '',
    },
  });
  useEffect(() => {
    if (!id && subjects.data?.[0])
      reset((v) => ({ ...v, subject_id: v.subject_id || subjects.data![0].id }));
  }, [id, reset, subjects.data]);
  useEffect(() => {
    if (item.data)
      reset({
        subject_id: item.data.subject_id,
        day_of_week: item.data.day_of_week,
        start: atTime(item.data.start_time),
        end: atTime(item.data.end_time),
        room: item.data.room,
      });
  }, [item.data, reset]);
  const save = useMutation({
    mutationFn: (v: Values) =>
      saveSchedule(
        {
          subject_id: v.subject_id,
          day_of_week: v.day_of_week,
          start_time: format(new Date(v.start), 'HH:mm:ss'),
          end_time: format(new Date(v.end), 'HH:mm:ss'),
          room: v.room,
        },
        id,
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.schedules });
      router.back();
    },
    onError: (e) => Alert.alert('Could not save class', getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => deleteRecord('class_schedules', id!),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.schedules });
      router.back();
    },
    onError: (e) => Alert.alert('Could not delete class', getErrorMessage(e)),
  });
  if (id && item.error)
    return (
      <FeedbackState
        actionLabel="Try again"
        message={item.error.message}
        onAction={() => void item.refetch()}
        title="Could not load class"
      />
    );
  if (id && item.isLoading)
    return <FeedbackState loading message="Loading class." title="One moment" />;
  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Classes repeat weekly in your local timezone."
        title={id ? 'Edit class' : 'Add class'}
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="subject_id"
          render={({ field }) => <SubjectField onChange={field.onChange} value={field.value} />}
        />
        <Controller
          control={control}
          name="day_of_week"
          render={({ field }) => (
            <ChoiceField
              choices={days.map((label, value) => ({ label, value }))}
              label="Day"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <FieldRow>
          <Controller
            control={control}
            name="start"
            render={({ field }) => (
              <DateTimeField
                label="Starts"
                mode="time"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="end"
            render={({ field }) => (
              <>
                <DateTimeField
                  label="Ends"
                  mode="time"
                  onChange={field.onChange}
                  value={field.value}
                />
                {errors.end ? (
                  <FormField
                    editable={false}
                    error={errors.end.message}
                    label="Time check"
                    value="Please adjust the time"
                  />
                ) : null}
              </>
            )}
          />
        </FieldRow>
        <Controller
          control={control}
          name="room"
          render={({ field }) => (
            <FormField label="Room" onChangeText={field.onChange} value={field.value} />
          )}
        />
        <AppButton
          label={id ? 'Save changes' : 'Add class'}
          loading={save.isPending}
          onPress={handleSubmit((v) => save.mutate(v))}
        />
        {id ? (
          <AppButton
            label="Delete class"
            loading={remove.isPending}
            onPress={() =>
              confirmDestructive('Delete class?', 'This removes the weekly class.', () =>
                remove.mutate(),
              )
            }
            variant="danger"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl } });
