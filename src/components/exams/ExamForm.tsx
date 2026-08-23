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
import { MultiChoiceField } from '@/components/ui/MultiChoiceField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { keys, useSubjects } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { cancelNotifications, scheduleExamReminders } from '@/lib/notifications';
import { deleteRecord, getExam, saveExam, updateExam } from '@/services';
import type { ExamStatus, ExamType } from '@/types';

const types: { label: string; value: ExamType }[] = ['QUIZ', 'EXAM', 'MIDTERM', 'FINAL', 'PRACTICAL', 'PRESENTATION', 'OTHER'].map((v) => ({ label: v, value: v as ExamType }));
const statuses: { label: string; value: ExamStatus }[] = ['UPCOMING', 'COMPLETED', 'CANCELLED'].map((v) => ({ label: v, value: v as ExamStatus }));
const reminderChoices = [{ label: '2 weeks before', value: 20160 }, { label: '1 week before', value: 10080 }, { label: '3 days before', value: 4320 }, { label: '1 day before', value: 1440 }, { label: '3 hours before', value: 180 }] as const;
const schema = z.object({ subject_id: z.string().min(1, 'Choose a subject.'), title: z.string().trim().min(1, 'Enter an exam title.').max(150, 'Keep the title under 150 characters.'), type: z.enum(['QUIZ', 'EXAM', 'MIDTERM', 'FINAL', 'PRACTICAL', 'PRESENTATION', 'OTHER']), exam_at: z.string().datetime('Choose a valid exam date.'), room: z.string().trim().max(50, 'Keep the room under 50 characters.'), coverage: z.string().trim().max(5000, 'Keep coverage under 5,000 characters.'), notes: z.string().trim().max(3000, 'Keep notes under 3,000 characters.'), status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED']), reminder_offsets: z.array(z.number().int().positive()).min(1, 'Choose at least one reminder.') });
type Values = z.infer<typeof schema>;

export function ExamForm({ id }: { id?: string }) {
  const router = useRouter(); const client = useQueryClient(); const subjects = useSubjects(); const item = useQuery({ queryKey: ['exam', id], queryFn: () => getExam(id!), enabled: Boolean(id) });
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { subject_id: '', title: '', type: 'EXAM', exam_at: addDays(new Date(), 7).toISOString(), room: '', coverage: '', notes: '', status: 'UPCOMING', reminder_offsets: [10080, 4320, 1440] } });
  useEffect(() => { if (!id && subjects.data?.[0]) reset((v) => ({ ...v, subject_id: v.subject_id || subjects.data![0].id })); }, [id, reset, subjects.data]);
  useEffect(() => { if (item.data) reset({ subject_id: item.data.subject_id, title: item.data.title, type: item.data.type, exam_at: item.data.exam_at, room: item.data.room, coverage: item.data.coverage, notes: item.data.notes, status: item.data.status, reminder_offsets: item.data.reminder_offsets }); }, [item.data, reset]);
  const save = useMutation({ mutationFn: async (v: Values) => { await cancelNotifications(item.data?.notification_ids ?? []); const saved = await saveExam({ ...v, notification_ids: [] }, id); if (v.status !== 'UPCOMING') return saved; const notificationIds = await scheduleExamReminders(v.title, v.exam_at, v.reminder_offsets); return updateExam(saved!.id, { notification_ids: notificationIds }); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.exams }); router.back(); }, onError: (e) => Alert.alert('Could not save exam', getErrorMessage(e)) });
  const remove = useMutation({ mutationFn: async () => { await cancelNotifications(item.data?.notification_ids ?? []); return deleteRecord('exams', id!); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.exams }); router.back(); }, onError: (e) => Alert.alert('Could not delete exam', getErrorMessage(e)) });
  if (id && item.error) return <FeedbackState actionLabel="Try again" message={item.error.message} onAction={() => void item.refetch()} title="Could not load exam" />;
  if (id && item.isLoading) return <FeedbackState loading message="Loading exam." title="One moment" />;
  return <ScreenContainer><ScreenHeader back description="Coverage becomes the basis of a study plan." title={id ? 'Exam details' : 'New exam'} /><View style={styles.form}>
    <Controller control={control} name="subject_id" render={({ field }) => <SubjectField error={errors.subject_id?.message} onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="title" render={({ field }) => <FormField error={errors.title?.message} label="Title" onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="type" render={({ field }) => <ChoiceField choices={types} label="Type" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="exam_at" render={({ field }) => <DateTimeField error={errors.exam_at?.message} label="Exam or quiz date and time" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="room" render={({ field }) => <FormField label="Room" onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="coverage" render={({ field }) => <FormField label="Coverage (one topic per line)" multiline onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="notes" render={({ field }) => <FormField label="Notes" multiline onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="status" render={({ field }) => <ChoiceField choices={statuses} label="Status" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="reminder_offsets" render={({ field }) => <MultiChoiceField choices={reminderChoices} error={errors.reminder_offsets?.message} label="Remind me" onChange={field.onChange} value={field.value} />} />
    <AppButton icon={id ? 'checkmark-circle-outline' : 'add-circle-outline'} label={id ? 'Save changes' : 'Add exam or quiz'} loading={save.isPending} onPress={handleSubmit((v) => save.mutate(v))} />
    {id ? <AppButton icon="trash-outline" label="Delete exam" loading={remove.isPending} onPress={() => Alert.alert('Delete exam?', 'Related study sessions will remain but lose this exam link.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() }])} variant="danger" /> : null}
  </View></ScreenContainer>;
}
const styles = StyleSheet.create({ form: { gap: spacing.lg, paddingBottom: spacing.xxl } });
