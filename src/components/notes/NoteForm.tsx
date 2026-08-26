import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { confirmDestructive } from '@/lib/confirm';
import { z } from 'zod';
import { useAssistantScreenContext } from '@/components/assistant/AssistantProvider';
import { SubjectField } from '@/components/forms/SubjectField';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { keys, useSubjects } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { deleteRecord, getNote, saveNote } from '@/services';

const schema = z.object({
  subject_id: z.string().min(1, 'Choose a subject.'),
  title: z
    .string()
    .trim()
    .min(1, 'Enter a note title.')
    .max(150, 'Keep the title under 150 characters.'),
  content: z.string().max(50000, 'Keep the note under 50,000 characters.'),
  favorite: z.boolean(),
});
type Values = z.infer<typeof schema>;
export function NoteForm({ id }: { id?: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const subjects = useSubjects();
  const item = useQuery({
    queryKey: ['note', id],
    queryFn: () => getNote(id!),
    enabled: Boolean(id),
  });

  useAssistantScreenContext(
    useMemo(
      () => ({ type: 'note', id, label: item.data?.title ?? (id ? 'Note' : 'New note') }),
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
    defaultValues: { subject_id: '', title: '', content: '', favorite: false },
  });
  useEffect(() => {
    if (!id && subjects.data?.[0])
      reset((v) => ({ ...v, subject_id: v.subject_id || subjects.data![0].id }));
  }, [id, reset, subjects.data]);
  useEffect(() => {
    if (item.data)
      reset({
        subject_id: item.data.subject_id,
        title: item.data.title ?? '',
        content: item.data.content,
        favorite: item.data.favorite,
      });
  }, [item.data, reset]);
  const save = useMutation({
    mutationFn: (v: Values) => saveNote(v, id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.notes });
      router.back();
    },
    onError: (e) => Alert.alert('Could not save note', getErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => deleteRecord('notes', id!),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.notes });
      router.back();
    },
    onError: (e) => Alert.alert('Could not delete note', getErrorMessage(e)),
  });
  if (id && item.error)
    return (
      <FeedbackState
        actionLabel="Try again"
        message={item.error.message}
        onAction={() => void item.refetch()}
        title="Could not load note"
      />
    );
  if (id && item.isLoading)
    return <FeedbackState loading message="Loading note." title="One moment" />;
  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Keep lightweight notes close to their subject."
        title={id ? 'Edit note' : 'New note'}
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="subject_id"
          render={({ field }) => <SubjectField onChange={field.onChange} value={field.value} />}
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
          name="content"
          render={({ field }) => (
            <FormField
              label="Note"
              multiline
              onChangeText={field.onChange}
              style={styles.note}
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="favorite"
          render={({ field }) => (
            <ChoiceField
              choices={[
                { label: 'Standard', value: 'NO' },
                { label: 'Favorite', value: 'YES' },
              ]}
              label="Favorite"
              onChange={(v) => field.onChange(v === 'YES')}
              value={field.value ? 'YES' : 'NO'}
            />
          )}
        />
        <AppButton
          label={id ? 'Save changes' : 'Create note'}
          loading={save.isPending}
          onPress={handleSubmit((v) => save.mutate(v))}
        />
        {id ? (
          <AppButton
            label="Delete note"
            loading={remove.isPending}
            onPress={() =>
              confirmDestructive('Delete note?', 'This cannot be undone.', () => remove.mutate())
            }
            variant="danger"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  note: { minHeight: 240 },
});
