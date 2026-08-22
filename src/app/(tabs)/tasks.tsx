import { format, formatDistanceToNow, isAfter, isBefore, isPast, isThisWeek, isToday } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { spacing } from '@/constants/theme';
import { useAssignments, useExams, useSubjects } from '@/hooks/useStudyData';
import type { Assignment } from '@/types';

type Filter = 'ALL' | 'TODAY' | 'WEEK' | 'UPCOMING' | 'COMPLETED' | 'OVERDUE';
const choices: { label: string; value: Filter }[] = [{ label: 'All', value: 'ALL' }, { label: 'Today', value: 'TODAY' }, { label: 'This week', value: 'WEEK' }, { label: 'Upcoming', value: 'UPCOMING' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Overdue', value: 'OVERDUE' }];
function matches(item: Assignment, filter: Filter) {
  const due = new Date(item.due_at); const completed = item.status === 'COMPLETED';
  if (filter === 'TODAY') return !completed && isToday(due);
  if (filter === 'WEEK') return !completed && isThisWeek(due, { weekStartsOn: 1 });
  if (filter === 'UPCOMING') return !completed && isAfter(due, new Date());
  if (filter === 'COMPLETED') return completed;
  if (filter === 'OVERDUE') return !completed && isPast(due);
  return true;
}

export default function TasksScreen() {
  const router = useRouter(); const assignments = useAssignments(); const exams = useExams(); const subjects = useSubjects(); const [filter, setFilter] = useState<Filter>('ALL');
  const bySubject = new Map(subjects.data?.map((s) => [s.id, s])); const filtered = assignments.data?.filter((item) => matches(item, filter)) ?? [];
  return <EntityList addLabel="Add assignment" description="Deadlines and exams, ordered by what needs attention." empty={false} emptyMessage="" error={assignments.error ?? exams.error} loading={assignments.isLoading || exams.isLoading} onAdd={() => router.push('/assignments/create')} onRefresh={() => void Promise.all([assignments.refetch(), exams.refetch(), subjects.refetch()])} refreshing={assignments.isRefetching || exams.isRefetching} title="Tasks">
    <AppButton label="Add quiz or exam" onPress={() => router.push('/exams/create')} variant="secondary" />
    <ChoiceField choices={choices} label="Filter assignments" onChange={setFilter} value={filter} />
    {filtered.map((item) => { const subject = bySubject.get(item.subject_id); const due = new Date(item.due_at); const overdue = item.status !== 'COMPLETED' && isBefore(due, new Date()); return <EntityCard accent={subject?.color} badge={overdue ? 'OVERDUE' : item.priority} key={item.id} metadata={item.status.replace('_', ' ')} onPress={() => router.push({ pathname: '/assignments/[id]', params: { id: item.id } })} subtitle={`${subject?.name ?? 'Subject'} · ${formatDistanceToNow(due, { addSuffix: true })}`} title={item.title} />; })}
    {!filtered.length ? <FeedbackState message="No assignments match this filter." title="All clear" /> : null}
    {(filter === 'ALL' || filter === 'UPCOMING') && exams.data?.filter((item) => item.status === 'UPCOMING').map((item) => { const subject = bySubject.get(item.subject_id); return <EntityCard accent={subject?.color} badge={item.type} key={item.id} metadata={format(new Date(item.exam_at), 'MMM d · h:mm a')} onPress={() => router.push({ pathname: '/exams/[id]', params: { id: item.id } })} subtitle={`${subject?.name ?? 'Subject'} · ${formatDistanceToNow(new Date(item.exam_at), { addSuffix: true })}`} title={item.title} />; })}
    <View style={styles.bottom} />
  </EntityList>;
}
const styles = StyleSheet.create({ bottom: { height: spacing.md } });
