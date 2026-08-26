import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAssistantScreenContext } from '@/components/assistant/AssistantProvider';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { spacing } from '@/constants/theme';
import { useSubjects } from '@/hooks/useStudyData';

export default function SubjectsScreen() {
  const router = useRouter();
  const query = useSubjects();
  const { width } = useWindowDimensions();
  const twoColumn = width >= 760;

  useAssistantScreenContext(useMemo(() => ({ type: 'subject', label: 'Subjects' }), []));
  return (
    <EntityList
      addLabel="Add subject manually"
      description="The foundation for classes, tasks, and study material."
      empty={!query.data?.length}
      emptyMessage="Add a subject manually or import your study load to organize the semester."
      error={query.error}
      loading={query.isLoading}
      onAdd={() => router.push('/subjects/create')}
      onRefresh={() => void query.refetch()}
      onSecondaryAdd={() => router.push('/subjects/import')}
      refreshing={query.isRefetching}
      secondaryAddLabel="Import study load"
      title="Subjects"
    >
      <View style={styles.grid}>
        {query.data?.map((item) => (
          <View key={item.id} style={twoColumn ? styles.cardHalf : styles.cardFull}>
            <EntityCard
              accent={item.color}
              metadata={[item.units ? `${item.units} units` : '', item.teacher, item.room]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => router.push({ pathname: '/subjects/[id]', params: { id: item.id } })}
              subtitle={item.code}
              title={item.name}
            />
          </View>
        ))}
      </View>
    </EntityList>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, width: '100%' },
  cardHalf: { width: '48.5%' },
  cardFull: { width: '100%' },
});
