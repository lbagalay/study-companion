import { addDays, isBefore, startOfDay, subDays } from 'date-fns';
import type { InsertOf } from '@/services';

type Input = { availableDays: number[]; duration: number; examAt: string; examId: string; now?: Date; plannedTime: string; subjectId: string; topics: string[] };
export function generateStudyPlan(input: Input): InsertOf<'study_sessions'>[] {
  const examDay = startOfDay(new Date(input.examAt)); const lastDay = subDays(examDay, 1); const today = startOfDay(input.now ?? new Date()); const dates: Date[] = [];
  for (let day = addDays(today, 1); !isBefore(lastDay, day); day = addDays(day, 1)) { if (input.availableDays.includes(day.getDay())) dates.push(day); }
  if (!dates.length && isBefore(today, examDay) && input.availableDays.includes(today.getDay())) dates.push(today);
  if (!dates.length) return [];
  const [hours, minutes] = input.plannedTime.split(':').map(Number); const reviewDate = dates.at(-1)!; const topicDates = dates.slice(0, -1); const buckets = topicDates.map(() => [] as string[]);
  input.topics.forEach((topic, index) => { if (buckets.length) buckets[index % buckets.length].push(topic); });
  const sessions = topicDates.map((date, index) => ({ subject_id: input.subjectId, exam_id: input.examId, topic: buckets[index].join(' · ') || 'Exam preparation', planned_at: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString(), planned_duration: input.duration, status: 'PLANNED' as const }));
  sessions.push({ subject_id: input.subjectId, exam_id: input.examId, topic: input.topics.length ? `Review: ${input.topics.join(' · ')}` : 'Final review', planned_at: new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate(), hours, minutes).toISOString(), planned_duration: input.duration, status: 'PLANNED' });
  return sessions;
}
