import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { confirmDestructive } from '@/lib/confirm';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { keys } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { deleteRecord, getSubject, saveSubject } from '@/services';

const colors = ['#0E1B48', '#C18DB4', '#E2CAD8', '#87A7D0', '#27425D', '#0E1F2F'] as const;
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a subject name.')
    .max(100, 'Keep the name under 100 characters.'),
  code: z.string().trim().max(30, 'Keep the code under 30 characters.'),
  description: z.string().trim().max(1000, 'Keep the description under 1,000 characters.'),
  teacher: z.string().trim().max(100, 'Keep the teacher name under 100 characters.'),
  room: z.string().trim().max(50, 'Keep the room under 50 characters.'),
  color: z.string(),
  semester: z.string().trim().max(50, 'Keep the semester under 50 characters.'),
  academic_year: z.string().trim().max(20, 'Keep the academic year under 20 characters.'),
  units: z
    .string()
    .refine(
      (value) =>
        value.trim() !== '' &&
        Number.isFinite(Number(value)) &&
        Number(value) >= 0 &&
        Number(value) <= 20,
      'Enter units from 0 to 20.',
    ),
});
type Values = z.infer<typeof schema>;
const defaults: Values = {
  name: '',
  code: '',
  description: '',
  teacher: '',
  room: '',
  color: colors[0],
  semester: '',
  academic_year: '',
  units: '0',
};

export function SubjectForm({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subject = useQuery({
    queryKey: ['subject', id],
    queryFn: () => getSubject(id!),
    enabled: Boolean(id),
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  useEffect(() => {
    if (subject.data) reset({ ...subject.data, units: String(subject.data.units) });
  }, [reset, subject.data]);
  const save = useMutation({
    mutationFn: (values: Values) => saveSubject({ ...values, units: Number(values.units) }, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.subjects });
      router.back();
    },
    onError: (error) => Alert.alert('Could not save subject', getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: () => deleteRecord('subjects', id!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.subjects });
      router.back();
    },
    onError: (error) => Alert.alert('Could not delete subject', getErrorMessage(error)),
  });
  const confirmDelete = () =>
    confirmDestructive(
      'Delete subject?',
      'Its classes, tasks, exams, materials, notes, and sessions will also be deleted.',
      () => remove.mutate(),
    );
  if (id && subject.error)
    return (
      <FeedbackState
        actionLabel="Try again"
        message={subject.error.message}
        onAction={() => void subject.refetch()}
        title="Could not load subject"
      />
    );
  if (id && subject.isLoading)
    return <FeedbackState loading message="Loading subject." title="One moment" />;
  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description={
          id
            ? 'Update details or review this subject.'
            : 'Organize classes and study work by subject.'
        }
        title={id ? 'Subject details' : 'New subject'}
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <FormField
              error={errors.name?.message}
              label="Subject name"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="code"
          render={({ field }) => (
            <FormField
              error={errors.code?.message}
              label="Subject code"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="teacher"
          render={({ field }) => (
            <FormField
              error={errors.teacher?.message}
              label="Teacher"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="room"
          render={({ field }) => (
            <FormField
              error={errors.room?.message}
              label="Room"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="units"
          render={({ field }) => (
            <FormField
              error={errors.units?.message}
              keyboardType="decimal-pad"
              label="Units"
              onChangeText={field.onChange}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="semester"
          render={({ field }) => (
            <FormField label="Semester" onChangeText={field.onChange} value={field.value} />
          )}
        />
        <Controller
          control={control}
          name="academic_year"
          render={({ field }) => (
            <FormField label="Academic year" onChangeText={field.onChange} value={field.value} />
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
          name="color"
          render={({ field }) => (
            <ChoiceField
              choices={colors.map((value) => ({ label: value, value }))}
              label="Color"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <AppButton
          label={id ? 'Save changes' : 'Add subject'}
          loading={save.isPending}
          onPress={handleSubmit((values) => save.mutate(values))}
        />
        {id ? (
          <AppButton
            label="Delete subject"
            loading={remove.isPending}
            onPress={confirmDelete}
            variant="danger"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl } });
