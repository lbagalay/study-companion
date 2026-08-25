import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { spacing } from '@/constants/theme';
import { useSessions, useSubjectMap, useSubjects } from '@/hooks/useStudyData';

export default function SessionsScreen() {
  const router = useRouter();
  const sessions = useSessions();
  const subjects = useSubjects();
  const bySubject = useSubjectMap();
  const { width } = useWindowDimensions();
  const twoColumn = width >= 760;
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
      <View style={styles.grid}>
        {sessions.data?.map((item) => {
          const subject = bySubject.get(item.subject_id);
          return (
            <View key={item.id} style={twoColumn ? styles.cardHalf : styles.cardFull}>
              <EntityCard
                accent={subject?.color}
                badge={item.status.replace('_', ' ')}
                metadata={`${format(new Date(item.planned_at), 'MMM d · h:mm a')} · ${item.planned_duration} min`}
                onPress={() =>
                  router.push({ pathname: '/sessions/[id]', params: { id: item.id } })
                }
                subtitle={subject?.name}
                title={item.topic}
              />
            </View>
          );
        })}
      </View>
    </EntityList>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, width: '100%' },
  cardHalf: { width: '48.5%' },
  cardFull: { width: '100%' },
});
