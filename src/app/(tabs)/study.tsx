import { format } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { radii, spacing, typography } from '@/constants/theme';
import { useMaterials, useNotes, useSessions, useSubjects } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { pdfReadingProgress } from '@/lib/pdf/progress';

export default function StudyScreen() {
  const router = useRouter(); const materials = useMaterials(); const notes = useNotes(); const sessions = useSessions(); const subjects = useSubjects(); const palette = useAppTheme();
  const bySubject = new Map(subjects.data?.map((s) => [s.id, s])); const loading = materials.isLoading || notes.isLoading || sessions.isLoading;
  const continueMaterial = materials.data?.filter((item) => item.type === 'PDF' && item.file_url && item.last_opened_at && !item.completed).sort((a, b) => new Date(b.last_opened_at!).getTime() - new Date(a.last_opened_at!).getTime())[0];
  const openMaterial = (item: NonNullable<typeof materials.data>[number]) => item.type === 'PDF' && item.file_url ? router.push(`/materials/${item.id}/reader` as never) : router.push({ pathname: '/materials/[id]', params: { id: item.id } });
  const openNote = (item: NonNullable<typeof notes.data>[number]) => item.material_id && item.page_number ? router.push({ pathname: '/materials/[id]/reader', params: { id: item.material_id, page: String(item.page_number) } }) : router.push({ pathname: '/notes/[id]', params: { id: item.id } });
  return <EntityList addLabel="Add material" description="Everything you need for focused study sessions." empty={false} emptyMessage="" error={materials.error ?? notes.error ?? sessions.error} loading={loading} onAdd={() => router.push('/materials/create')} onRefresh={() => void Promise.all([materials.refetch(), notes.refetch(), sessions.refetch(), subjects.refetch()])} refreshing={materials.isRefetching || notes.isRefetching || sessions.isRefetching} title="Study">
    <View style={[styles.ritual, { backgroundColor: palette.lavenderSoft, borderColor: palette.border }]}>
      <View style={styles.ritualHeading}><View style={[styles.ritualIcon, { backgroundColor: palette.surface }]}><Ionicons color={palette.accent} name="ribbon-outline" size={20} /></View><View style={styles.ritualCopy}><Text style={[styles.ritualEyebrow, { color: palette.accentStrong }]}>YOUR STUDY RITUAL</Text><Text style={[styles.ritualTitle, { color: palette.text }]}>Make space to focus</Text></View><Ionicons color={palette.lavender} name="sparkles-outline" size={18} /></View>
      <Text style={[styles.ritualDescription, { color: palette.textMuted }]}>Open a material, capture a thought, or make a gentle plan for what comes next.</Text>
      <View style={styles.actions}><AppButton label="New note" onPress={() => router.push('/notes/create')} style={styles.action} variant="secondary" /><AppButton label="Plan study" onPress={() => router.push('/sessions/create-plan')} style={styles.action} variant="secondary" /></View>
    </View>
    <StudySectionTitle color={palette.text} index="01" title="Continue Studying" />
    {continueMaterial ? <EntityCard accent={bySubject.get(continueMaterial.subject_id)?.color} badge={`${pdfReadingProgress(continueMaterial.last_read_page, continueMaterial.page_count ?? 0)}%`} metadata={`Page ${continueMaterial.last_read_page} of ${continueMaterial.page_count ?? '?'} · Last opened ${format(new Date(continueMaterial.last_opened_at!), 'MMM d · h:mm a')}`} onPress={() => openMaterial(continueMaterial)} subtitle={bySubject.get(continueMaterial.subject_id)?.name} title={continueMaterial.title} /> : <FeedbackState message="Open an uploaded PDF and your saved reading position will appear here." title="No PDF in progress" />}
    <StudySectionTitle color={palette.text} index="02" title="Next sessions" />
    {sessions.data?.filter((s) => s.status === 'PLANNED' || s.status === 'IN_PROGRESS').slice(0, 4).map((item) => { const subject = bySubject.get(item.subject_id); return <EntityCard accent={subject?.color} badge={`${item.planned_duration} MIN`} key={item.id} metadata={format(new Date(item.planned_at), 'MMM d · h:mm a')} onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: item.id } })} subtitle={subject?.name} title={item.topic} />; })}
    {!sessions.data?.length ? <FeedbackState message="Create a study plan from an upcoming exam." title="No sessions planned" /> : null}<AppButton label="View all sessions" onPress={() => router.push('/sessions')} variant="ghost" />
    <StudySectionTitle color={palette.text} index="03" title="Materials" />
    {materials.data?.map((item) => { const subject = bySubject.get(item.subject_id); const pdfProgress = item.type === 'PDF' && item.page_count ? pdfReadingProgress(item.last_read_page, item.page_count) : null; return <EntityCard accent={subject?.color} badge={item.favorite ? 'FAVORITE' : pdfProgress === null ? item.type : `${pdfProgress}%`} key={item.id} metadata={item.completed ? 'Completed' : pdfProgress === null ? 'To review' : `Page ${item.last_read_page} of ${item.page_count}`} onPress={() => openMaterial(item)} subtitle={subject?.name} title={item.title} />; })}
    {!materials.data?.length ? <FeedbackState message="Upload a file or save a useful study link." title="No materials yet" /> : null}
    <StudySectionTitle color={palette.text} index="04" title="Notes" />
    {notes.data?.map((item) => { const subject = bySubject.get(item.subject_id); return <EntityCard accent={subject?.color} badge={item.favorite ? 'FAVORITE' : item.page_number ? `PAGE ${item.page_number}` : undefined} key={item.id} metadata={format(new Date(item.updated_at), 'MMM d')} onPress={() => openNote(item)} subtitle={subject?.name} title={item.title ?? `Page ${item.page_number ?? '—'} note`} />; })}
    {!notes.data?.length ? <FeedbackState message="Create a lightweight subject note." title="No notes yet" /> : null}
  </EntityList>;
}
function StudySectionTitle({ color, index, title }: { color: string; index: string; title: string }) { return <View style={styles.sectionHeading}><Text style={[styles.sectionIndex, { color }]}>{index}</Text><Text style={[styles.section, { color }]}>{title}</Text><View style={[styles.sectionRule, { backgroundColor: color }]} /></View>; }
const styles = StyleSheet.create({
  ritual: { borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, overflow: 'hidden', padding: spacing.lg },
  ritualHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  ritualIcon: { alignItems: 'center', borderRadius: radii.pill, height: 44, justifyContent: 'center', width: 44 },
  ritualCopy: { flex: 1, gap: 2 },
  ritualEyebrow: { ...typography.label, fontSize: 9 },
  ritualTitle: { ...typography.sectionTitle, fontSize: 21 },
  ritualDescription: { ...typography.body, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  sectionIndex: { ...typography.label, fontSize: 9, opacity: 0.5 },
  section: typography.sectionTitle,
  sectionRule: { flex: 1, height: 1, marginLeft: spacing.xs, opacity: 0.16 },
});
