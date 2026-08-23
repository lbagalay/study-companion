import { differenceInCalendarDays, format, formatDistanceToNow, isThisWeek, parse } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { EditorialBackdrop } from '@/components/ui/EditorialBackdrop';
import { EntityCard } from '@/components/ui/EntityCard';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { radii, spacing, typography } from '@/constants/theme';
import { useAssignments, useExams, useProfile, useSchedules, useSessions, useSubjects } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/providers/AuthProvider';
import { assignmentUrgency, examUrgency, isClassCurrent } from '@/lib/dates';

type Upcoming = { accent?: string; badge: string; date: Date; href: '/assignments/[id]' | '/exams/[id]'; id: string; score: number; subtitle: string; title: string };
const clock = (value: string) => format(parse(value, 'HH:mm:ss', new Date()), 'h:mm a');

export default function HomeScreen() {
  const palette = useAppTheme(); const router = useRouter(); const { user } = useAuth(); const profile = useProfile(user?.id); const subjects = useSubjects(); const schedules = useSchedules(); const assignments = useAssignments(); const exams = useExams(); const sessions = useSessions();
  const bySubject = new Map(subjects.data?.map((s) => [s.id, s])); const now = new Date(); const hour = now.getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; const name = profile.data?.preferred_name || profile.data?.full_name.split(' ')[0] || 'Student';
  const todayClasses = schedules.data?.filter((s) => s.day_of_week === now.getDay()) ?? [];
  const upcoming: Upcoming[] = [
    ...(assignments.data?.filter((a) => a.status !== 'COMPLETED').map((a) => { const date = new Date(a.due_at); const days = differenceInCalendarDays(date, now); return { accent: bySubject.get(a.subject_id)?.color, badge: days < 0 ? 'OVERDUE' : a.priority, date, href: '/assignments/[id]' as const, id: a.id, score: assignmentUrgency(a, now), subtitle: `${bySubject.get(a.subject_id)?.name ?? 'Subject'} · ${formatDistanceToNow(date, { addSuffix: true })}`, title: a.title }; }) ?? []),
    ...(exams.data?.filter((e) => e.status === 'UPCOMING').map((e) => { const date = new Date(e.exam_at); return { accent: bySubject.get(e.subject_id)?.color, badge: e.type, date, href: '/exams/[id]' as const, id: e.id, score: examUrgency(e, now), subtitle: `${bySubject.get(e.subject_id)?.name ?? 'Subject'} · ${formatDistanceToNow(date, { addSuffix: true })}`, title: e.title }; }) ?? []),
  ].sort((a, b) => a.score - b.score || a.date.getTime() - b.date.getTime()).slice(0, 5);
  const nextSession = sessions.data?.find((s) => ['PLANNED', 'IN_PROGRESS'].includes(s.status) && new Date(s.planned_at) >= now);
  const loading = profile.isLoading || subjects.isLoading || schedules.isLoading || assignments.isLoading || exams.isLoading || sessions.isLoading;
  if (loading) return <FeedbackState loading message="Preparing today’s overview." title="One moment" />;
  return <View style={[styles.screen, { backgroundColor: palette.background }]}><EditorialBackdrop /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={[styles.hero, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      <View style={[styles.heroGlow, { backgroundColor: palette.lavenderSoft }]} />
      <View style={styles.heroDecor}><Ionicons color={palette.accent} name="heart-outline" size={17} /><Ionicons color={palette.lavender} name="sparkles-outline" size={15} /></View>
      <View style={styles.heroTop}><View style={[styles.heroIcon, { backgroundColor: palette.surface }]}><Ionicons color={palette.accent} name="sparkles" size={22} /></View><Text style={[styles.date, { color: palette.accentStrong }]}>{format(now, 'EEEE, MMMM d')}</Text></View>
      <Text style={[styles.greeting, { color: palette.text }]}>{greeting}, {name}</Text>
      <Text style={[styles.heroCopy, { color: palette.textMuted }]}>{upcoming[0] ? `${upcoming[0].title} is ${formatDistanceToNow(upcoming[0].date, { addSuffix: true })}. You’ve got this.` : 'Your study space is calm and clear today.'}</Text>
    </View>
    <View style={styles.quickActions}>
      <QuickAction color={palette.accent} icon="checkbox-outline" label="Activity" onPress={() => router.push('/assignments/create')} surface={palette.accentSoft} textColor={palette.text} />
      <QuickAction color={palette.lavender} icon="school-outline" label="Exam or quiz" onPress={() => router.push('/exams/create')} surface={palette.lavenderSoft} textColor={palette.text} />
      <QuickAction color={palette.warning} icon="book-outline" label="Study plan" onPress={() => router.push('/sessions/create-plan')} surface={palette.peachSoft} textColor={palette.text} />
    </View>
    <Section title="Today" color={palette.text}>{todayClasses.map((item) => { const subject = bySubject.get(item.subject_id); const current = isClassCurrent(item.start_time, item.end_time, now); return <EntityCard accent={subject?.color} badge={current ? 'NOW' : clock(item.start_time)} key={item.id} metadata={item.room || subject?.room} onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: item.id } })} subtitle={`${clock(item.start_time)}–${clock(item.end_time)}`} title={subject?.name ?? 'Class'} />; })}{!todayClasses.length ? <FeedbackState message="No classes are scheduled today." title="A clear day" /> : null}</Section>
    <Section title="Coming up" color={palette.text}>{upcoming.map((item) => <EntityCard accent={item.accent} badge={item.badge} key={`${item.href}-${item.id}`} onPress={() => router.push({ pathname: item.href, params: { id: item.id } })} subtitle={item.subtitle} title={item.title} />)}{!upcoming.length ? <FeedbackState message="Everything currently recorded is complete." title="You’re caught up" /> : null}</Section>
    <Section title="Continue studying" color={palette.text}>{nextSession ? <EntityCard accent={bySubject.get(nextSession.subject_id)?.color} badge={`${nextSession.planned_duration} MIN`} metadata={format(new Date(nextSession.planned_at), 'MMM d · h:mm a')} onPress={() => router.push({ pathname: '/sessions/[id]', params: { id: nextSession.id } })} subtitle={bySubject.get(nextSession.subject_id)?.name} title={nextSession.topic} /> : <FeedbackState message="Generate a study plan from an upcoming exam." title="No active session" />}</Section>
    <Section title="This week" color={palette.text}><View style={styles.stats}><Stat color={palette.text} label="Tasks done" surface={palette.surface} value={assignments.data?.filter((a) => a.completed_at && isThisWeek(new Date(a.completed_at), { weekStartsOn: 1 })).length ?? 0} /><Stat color={palette.text} label="Remaining" surface={palette.surface} value={assignments.data?.filter((a) => a.status !== 'COMPLETED').length ?? 0} /><Stat color={palette.text} label="Study sessions" surface={palette.surface} value={sessions.data?.filter((s) => s.status === 'COMPLETED' && isThisWeek(new Date(s.updated_at), { weekStartsOn: 1 })).length ?? 0} /><Stat color={palette.text} label="Upcoming exams" surface={palette.surface} value={exams.data?.filter((e) => e.status === 'UPCOMING').length ?? 0} /></View></Section>
    <AppButton label="Manage subjects" onPress={() => router.push('/subjects')} variant="secondary" />
  </ScrollView></View>;
}
function Section({ children, color, title }: React.PropsWithChildren<{ color: string; title: string }>) { return <View style={styles.section}><Text style={[styles.sectionTitle, { color }]}>{title}</Text>{children}</View>; }
function QuickAction({ color, icon, label, onPress, surface, textColor }: { color: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; surface: string; textColor: string }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, { backgroundColor: surface, opacity: pressed ? 0.76 : 1 }]}><Ionicons color={color} name={icon} size={21} /><Text numberOfLines={1} style={[styles.quickLabel, { color: textColor }]}>{label}</Text></Pressable>; }
function Stat({ color, label, surface, value }: { color: string; label: string; surface: string; value: number }) { return <View style={[styles.stat, { backgroundColor: surface }]}><Text style={[styles.statValue, { color }]}>{value}</Text><Text style={[styles.statLabel, { color }]}>{label}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { alignSelf: 'center', gap: spacing.xl, maxWidth: 920, paddingBottom: 124, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, width: '100%' },
  hero: { borderRadius: radii.xl, borderWidth: 1, boxShadow: '0 18px 42px rgba(14, 27, 72, 0.10)', gap: spacing.sm, overflow: 'hidden', padding: spacing.xl },
  heroGlow: { borderRadius: radii.pill, height: 180, opacity: 0.8, pointerEvents: 'none', position: 'absolute', right: -70, top: -70, width: 180 },
  heroDecor: { flexDirection: 'row', gap: spacing.sm, opacity: 0.6, position: 'absolute', right: spacing.lg, top: spacing.lg },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  heroIcon: { alignItems: 'center', borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  greeting: typography.title,
  date: { ...typography.label, flex: 1 },
  heroCopy: { ...typography.body, maxWidth: 620 },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickAction: { alignItems: 'center', borderRadius: radii.md, flex: 1, gap: 6, justifyContent: 'center', minHeight: 82, paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  quickLabel: { ...typography.caption, fontWeight: '700', textAlign: 'center' },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.sectionTitle, fontSize: 24 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { borderRadius: radii.lg, boxShadow: '0 8px 22px rgba(14, 27, 72, 0.06)', flexBasis: '47%', flexGrow: 1, gap: spacing.xs, minWidth: 140, padding: spacing.lg },
  statValue: { fontFamily: typography.title.fontFamily, fontSize: 32, fontWeight: '600' },
  statLabel: typography.caption,
});
