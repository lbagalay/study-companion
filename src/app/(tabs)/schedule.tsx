import { format, parse } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { days } from '@/components/schedule/ScheduleForm';
import { useSchedules, useSubjects } from '@/hooks/useStudyData';

const showTime = (value: string) => format(parse(value, 'HH:mm:ss', new Date()), 'h:mm a');
export default function ScheduleScreen() {
  const router = useRouter(); const schedules = useSchedules(); const subjects = useSubjects(); const [mode, setMode] = useState<'WEEK' | 'TODAY'>('WEEK');
  const subjectById = new Map(subjects.data?.map((subject) => [subject.id, subject]));
  const visible = schedules.data?.filter((item) => mode === 'WEEK' || item.day_of_week === new Date().getDay()) ?? [];
  return <EntityList addLabel="Add class" description="Your recurring weekly class timetable." empty={!schedules.data?.length} emptyMessage="Add your first class so today’s schedule appears on Home." error={schedules.error} loading={schedules.isLoading} onAdd={() => router.push('/schedule/create')} onRefresh={() => void Promise.all([schedules.refetch(), subjects.refetch()])} refreshing={schedules.isRefetching} title="Schedule">
    <ChoiceField choices={[{ label: 'Week', value: 'WEEK' }, { label: 'Today', value: 'TODAY' }]} label="View" onChange={setMode} value={mode} />
    {visible.map((item) => { const subject = subjectById.get(item.subject_id); return <EntityCard accent={subject?.color} key={item.id} metadata={[item.room || subject?.room].filter(Boolean).join(' · ')} onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: item.id } })} subtitle={`${days[item.day_of_week]} · ${showTime(item.start_time)}–${showTime(item.end_time)}`} title={subject?.name ?? 'Class'} />; })}
    {!visible.length && schedules.data?.length ? <FeedbackState message="No classes are scheduled today." title="A clear day" /> : null}
  </EntityList>;
}
