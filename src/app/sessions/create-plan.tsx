import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { DateTimeField } from '@/components/forms/DateTimeField';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FieldRow } from '@/components/ui/FieldRow';
import { FormField } from '@/components/ui/FormField';
import { MultiChoiceField } from '@/components/ui/MultiChoiceField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing } from '@/constants/theme';
import { keys, useExams } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { scheduleReminders } from '@/lib/notifications';
import { generateStudyPlan } from '@/lib/study-plan/generateStudyPlan';
import { saveSessions, updateSession } from '@/services';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const schema = z.object({
  examId: z.string(),
  topics: z.string().max(5000),
  duration: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 5 && Number(v) <= 480,
      'Enter 5–480 minutes.',
    ),
  availableDays: z.array(z.number().min(0).max(6)).min(1, 'Choose at least one day.'),
  time: z.string().datetime({ offset: true }),
});
type Values = z.infer<typeof schema>;
export default function CreatePlanScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const exams = useExams();
  const upcoming = useMemo(
    () =>
      exams.data?.filter((e) => e.status === 'UPCOMING' && new Date(e.exam_at) > new Date()) ?? [],
    [exams.data],
  );
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      examId: '',
      topics: '',
      duration: '30',
      availableDays: [1, 2, 3, 4, 5, 6],
      time: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
    },
  });
  const examId = useWatch({ control, name: 'examId' });
  const topics = useWatch({ control, name: 'topics' });
  const selectedExamId = examId || upcoming[0]?.id || '';
  const selectedExam = upcoming.find((e) => e.id === selectedExamId);
  const displayedTopics = topics || selectedExam?.coverage || '';
  const create = useMutation({
    mutationFn: async (values: Values) => {
      const exam = upcoming.find((e) => e.id === (values.examId || upcoming[0]?.id));
      if (!exam) throw new Error('Choose an upcoming exam.');
      const plan = generateStudyPlan({
        availableDays: values.availableDays,
        duration: Number(values.duration),
        examAt: exam.exam_at,
        examId: exam.id,
        plannedTime: format(new Date(values.time), 'HH:mm'),
        subjectId: exam.subject_id,
        topics: (values.topics || exam.coverage)
          .split(/\n|,/)
          .map((v) => v.trim())
          .filter(Boolean),
      });
      if (!plan.length) throw new Error('There are no available study days before this exam.');
      const saved = await saveSessions(plan);
      await Promise.all(
        saved.map(async (session) => {
          const ids = await scheduleReminders(
            session.topic,
            'Your study session starts in 15 minutes.',
            session.planned_at,
            [15],
          );
          if (ids[0]) await updateSession(session.id, { notification_id: ids[0] });
        }),
      );
      return saved;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.sessions });
      Alert.alert('Study plan created', 'You can adjust each session from the Study tab.');
      router.back();
    },
    onError: (e) => Alert.alert('Could not create plan', getErrorMessage(e)),
  });
  if (exams.isLoading)
    return <FeedbackState loading message="Loading upcoming exams." title="One moment" />;
  if (!upcoming.length)
    return (
      <ScreenContainer>
        <ScreenHeader back title="Create study plan" />
        <FeedbackState
          message="Add an upcoming exam first, including its coverage topics."
          title="No upcoming exams"
        />
      </ScreenContainer>
    );
  return (
    <ScreenContainer>
      <ScreenHeader
        back
        description="Topics are distributed across available days; the final day is review."
        title="Create study plan"
      />
      <View style={styles.form}>
        <Controller
          control={control}
          name="examId"
          render={({ field }) => (
            <ChoiceField
              choices={upcoming.map((e) => ({ label: e.title, value: e.id }))}
              label="Exam"
              onChange={(id) => {
                field.onChange(id);
                setValue('topics', upcoming.find((e) => e.id === id)?.coverage ?? '');
              }}
              value={selectedExamId}
            />
          )}
        />
        <Controller
          control={control}
          name="topics"
          render={({ field }) => (
            <FormField
              label="Topics (one per line)"
              multiline
              onChangeText={field.onChange}
              value={displayedTopics}
            />
          )}
        />
        <Controller
          control={control}
          name="availableDays"
          render={({ field }) => (
            <MultiChoiceField
              choices={days.map((label, value) => ({ label, value }))}
              label="Available days"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        {errors.availableDays ? (
          <FormField
            editable={false}
            error={errors.availableDays.message}
            label="Availability"
            value="Choose a day"
          />
        ) : null}
        <FieldRow>
          <Controller
            control={control}
            name="duration"
            render={({ field }) => (
              <FormField
                error={errors.duration?.message}
                keyboardType="number-pad"
                label="Session duration (minutes)"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="time"
            render={({ field }) => (
              <DateTimeField
                label="Preferred time"
                mode="time"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </FieldRow>
        <AppButton
          label="Generate sessions"
          loading={create.isPending}
          onPress={handleSubmit((v) => create.mutate(v))}
        />
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl } });
