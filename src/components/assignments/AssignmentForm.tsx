import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { DateTimeField } from '@/components/forms/DateTimeField';
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
import { cancelNotifications, scheduleReminders } from '@/lib/notifications';
import { deleteRecord, getAssignment, saveAssignment, updateAssignment } from '@/services';
import type { AssignmentPriority, AssignmentStatus } from '@/types';

const priorities: { label: string; value: AssignmentPriority }[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => ({ label: value, value: value as AssignmentPriority }));
const statuses: { label: string; value: AssignmentStatus }[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].map((value) => ({ label: value.replace('_', ' '), value: value as AssignmentStatus }));
const schema = z.object({ subject_id: z.string().min(1, 'Choose a subject.'), title: z.string().trim().min(1, 'Enter an assignment title.').max(150, 'Keep the title under 150 characters.'), description: z.string().trim().max(3000, 'Keep the description under 3,000 characters.'), due_at: z.string().datetime('Choose a valid due date.'), priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']), status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']), notes: z.string().trim().max(3000, 'Keep notes under 3,000 characters.') });
type Values = z.infer<typeof schema>;

export function AssignmentForm({ id }: { id?: string }) {
  const router = useRouter(); const client = useQueryClient(); const subjects = useSubjects(); const item = useQuery({ queryKey: ['assignment', id], queryFn: () => getAssignment(id!), enabled: Boolean(id) });
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { subject_id: '', title: '', description: '', due_at: addDays(new Date(), 1).toISOString(), priority: 'MEDIUM', status: 'NOT_STARTED', notes: '' } });
  useEffect(() => { if (!id && subjects.data?.[0]) reset((v) => ({ ...v, subject_id: v.subject_id || subjects.data![0].id })); }, [id, reset, subjects.data]);
  useEffect(() => { if (item.data) reset({ subject_id: item.data.subject_id, title: item.data.title, description: item.data.description, due_at: item.data.due_at, priority: item.data.priority, status: item.data.status, notes: item.data.notes }); }, [item.data, reset]);
  const save = useMutation({ mutationFn: async (v: Values) => { await cancelNotifications(item.data?.notification_ids ?? []); const saved = await saveAssignment({ ...v, completed_at: v.status === 'COMPLETED' ? item.data?.completed_at ?? new Date().toISOString() : null, notification_ids: [] }, id); if (v.status === 'COMPLETED') return saved; const notificationIds = await scheduleReminders(v.title, 'An assignment deadline is approaching.', v.due_at, item.data?.reminder_offsets ?? [1440, 180, 60]); return updateAssignment(saved!.id, { notification_ids: notificationIds }); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.assignments }); router.back(); }, onError: (e) => Alert.alert('Could not save assignment', getErrorMessage(e)) });
  const remove = useMutation({ mutationFn: async () => { await cancelNotifications(item.data?.notification_ids ?? []); return deleteRecord('assignments', id!); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.assignments }); router.back(); }, onError: (e) => Alert.alert('Could not delete assignment', getErrorMessage(e)) });
  if (id && item.error) return <FeedbackState actionLabel="Try again" message={item.error.message} onAction={() => void item.refetch()} title="Could not load assignment" />;
  if (id && item.isLoading) return <FeedbackState loading message="Loading assignment." title="One moment" />;
  return <ScreenContainer><ScreenHeader back description="Set a clear due date and priority." title={id ? 'Edit assignment' : 'New assignment'} /><View style={styles.form}>
    <Controller control={control} name="subject_id" render={({ field }) => <SubjectField onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="title" render={({ field }) => <FormField error={errors.title?.message} label="Title" onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="description" render={({ field }) => <FormField label="Description" multiline onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="due_at" render={({ field }) => <DateTimeField label="Due" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="priority" render={({ field }) => <ChoiceField choices={priorities} label="Priority" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="status" render={({ field }) => <ChoiceField choices={statuses} label="Status" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="notes" render={({ field }) => <FormField label="Notes" multiline onChangeText={field.onChange} value={field.value} />} />
    <AppButton label={id ? 'Save changes' : 'Add assignment'} loading={save.isPending} onPress={handleSubmit((v) => save.mutate(v))} />
    {id ? <AppButton label="Delete assignment" loading={remove.isPending} onPress={() => Alert.alert('Delete assignment?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() }])} variant="danger" /> : null}
  </View></ScreenContainer>;
}
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl } });
