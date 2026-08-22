import { useRouter } from 'expo-router';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { useSubjects } from '@/hooks/useStudyData';

export default function SubjectsScreen() {
  const router = useRouter(); const query = useSubjects();
  return <EntityList addLabel="Add subject" description="The foundation for classes, tasks, and study material." empty={!query.data?.length} emptyMessage="Add your first subject to start organizing your semester." error={query.error} loading={query.isLoading} onAdd={() => router.push('/subjects/create')} onRefresh={() => void query.refetch()} refreshing={query.isRefetching} title="Subjects">
    {query.data?.map((item) => <EntityCard accent={item.color} key={item.id} metadata={[item.teacher, item.room].filter(Boolean).join(' · ')} onPress={() => router.push({ pathname: '/subjects/[id]', params: { id: item.id } })} subtitle={item.code} title={item.name} />)}
  </EntityList>;
}
