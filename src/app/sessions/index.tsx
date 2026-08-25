import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { useSessions, useSubjectMap, useSubjects } from '@/hooks/useStudyData';

export default function SessionsScreen() {
  const router = useRouter();
  const sessions = useSessions();
  const subjects = useSubjects();
  const bySubject = useSubjectMap();
  return (
    <EntityList
      addLabel="Create study plan"
      description="Planned, active, completed, and skipped sessions."
      empty={!sessions.data?.length}
      emptyMessage="Create a plan from an upcoming exam."
      error={sessions.error}
      loading={sessions.isLoading}
      onAdd={() => router.push('/sessions/create-plan')}
      onRefresh={() => void Promise.all([sessions.refetch(), subjects.refetch()])}
      refreshing={sessions.isRefetching}
      title="Study sessions"
    >
      {sessions.data?.map((item) => {
        const subject = bySubject.get(item.subject_id);
        return (
          <EntityCard
            accent={subject?.color}
            badge={item.status.replace('_', ' ')}
            key={item.id}
            metadata={`${format(new Date(item.planned_at), 'MMM d · h:mm a')} · ${item.planned_duration} min`}
            onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: item.id } })}
            subtitle={subject?.name}
            title={item.topic}
          />
        );
      })}
    </EntityList>
  );
}
