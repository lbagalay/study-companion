import { format } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { spacing, typography } from '@/constants/theme';
import { useMaterials, useNotes, useSessions, useSubjects } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function StudyScreen() {
  const router = useRouter(); const materials = useMaterials(); const notes = useNotes(); const sessions = useSessions(); const subjects = useSubjects(); const palette = useAppTheme();
  const bySubject = new Map(subjects.data?.map((s) => [s.id, s])); const loading = materials.isLoading || notes.isLoading || sessions.isLoading;
  return <EntityList addLabel="Add material" description="Everything you need for focused study sessions." empty={false} emptyMessage="" error={materials.error ?? notes.error ?? sessions.error} loading={loading} onAdd={() => router.push('/materials/create')} onRefresh={() => void Promise.all([materials.refetch(), notes.refetch(), sessions.refetch(), subjects.refetch()])} refreshing={materials.isRefetching || notes.isRefetching || sessions.isRefetching} title="Study">
    <View style={styles.actions}><AppButton label="New note" onPress={() => router.push('/notes/create')} style={styles.action} variant="secondary" /><AppButton label="Plan study" onPress={() => router.push('/sessions/create-plan')} style={styles.action} variant="secondary" /></View>
    <Text style={[styles.section, { color: palette.text }]}>Next sessions</Text>
    {sessions.data?.filter((s) => s.status === 'PLANNED' || s.status === 'IN_PROGRESS').slice(0, 4).map((item) => { const subject = bySubject.get(item.subject_id); return <EntityCard accent={subject?.color} badge={`${item.planned_duration} MIN`} key={item.id} metadata={format(new Date(item.planned_at), 'MMM d · h:mm a')} onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: item.id } })} subtitle={subject?.name} title={item.topic} />; })}
    {!sessions.data?.length ? <FeedbackState message="Create a study plan from an upcoming exam." title="No sessions planned" /> : null}<AppButton label="View all sessions" onPress={() => router.push('/sessions')} variant="ghost" />
    <Text style={[styles.section, { color: palette.text }]}>Materials</Text>
    {materials.data?.map((item) => { const subject = bySubject.get(item.subject_id); return <EntityCard accent={subject?.color} badge={item.favorite ? 'FAVORITE' : item.type} key={item.id} metadata={item.completed ? 'Completed' : 'To review'} onPress={() => router.push({ pathname: '/materials/[id]', params: { id: item.id } })} subtitle={subject?.name} title={item.title} />; })}
    {!materials.data?.length ? <FeedbackState message="Upload a file or save a useful study link." title="No materials yet" /> : null}
    <Text style={[styles.section, { color: palette.text }]}>Notes</Text>
    {notes.data?.map((item) => { const subject = bySubject.get(item.subject_id); return <EntityCard accent={subject?.color} badge={item.favorite ? 'FAVORITE' : undefined} key={item.id} metadata={format(new Date(item.updated_at), 'MMM d')} onPress={() => router.push({ pathname: '/notes/[id]', params: { id: item.id } })} subtitle={subject?.name} title={item.title} />; })}
    {!notes.data?.length ? <FeedbackState message="Create a lightweight subject note." title="No notes yet" /> : null}
  </EntityList>;
}
const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1 }, section: { ...typography.sectionTitle, marginTop: spacing.md } });
