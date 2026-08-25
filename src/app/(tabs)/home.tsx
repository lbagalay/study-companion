import { differenceInCalendarDays, format, formatDistanceToNow, isThisWeek, parse } from 'date-fns';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { EditorialBackdrop } from '@/components/ui/EditorialBackdrop';
import { EntityCard } from '@/components/ui/EntityCard';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { MotionIcon } from '@/components/ui/MotionIcon';
import { radii, spacing, typography } from '@/constants/theme';
import {
  useAssignments,
  useExams,
  useProfile,
  useSchedules,
  useSessions,
  useSubjectMap,
  useSubjects,
} from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAuth } from '@/providers/AuthProvider';
import { assignmentUrgency, examUrgency, isClassCurrent } from '@/lib/dates';

type Upcoming = {
  accent?: string;
  badge: string;
  date: Date;
  href: '/assignments/[id]' | '/exams/[id]';
  id: string;
  score: number;
  subtitle: string;
  title: string;
};
const clock = (value: string) => format(parse(value, 'HH:mm:ss', new Date()), 'h:mm a');

export default function HomeScreen() {
  const palette = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const subjects = useSubjects();
  const schedules = useSchedules();
  const assignments = useAssignments();
  const exams = useExams();
  const sessions = useSessions();
  const bySubject = useSubjectMap();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = profile.data?.preferred_name || profile.data?.full_name.split(' ')[0] || 'Student';
  const todayClasses = schedules.data?.filter((s) => s.day_of_week === now.getDay()) ?? [];
  const upcoming: Upcoming[] = [
    ...(assignments.data
      ?.filter((a) => a.status !== 'COMPLETED')
      .map((a) => {
        const date = new Date(a.due_at);
        const days = differenceInCalendarDays(date, now);
        return {
          accent: bySubject.get(a.subject_id)?.color,
          badge: days < 0 ? 'OVERDUE' : a.priority,
          date,
          href: '/assignments/[id]' as const,
          id: a.id,
          score: assignmentUrgency(a, now),
          subtitle: `${bySubject.get(a.subject_id)?.name ?? 'Subject'} · ${formatDistanceToNow(date, { addSuffix: true })}`,
          title: a.title,
        };
      }) ?? []),
    ...(exams.data
      ?.filter((e) => e.status === 'UPCOMING')
      .map((e) => {
        const date = new Date(e.exam_at);
        return {
          accent: bySubject.get(e.subject_id)?.color,
          badge: e.type,
          date,
          href: '/exams/[id]' as const,
          id: e.id,
          score: examUrgency(e, now),
          subtitle: `${bySubject.get(e.subject_id)?.name ?? 'Subject'} · ${formatDistanceToNow(date, { addSuffix: true })}`,
          title: e.title,
        };
      }) ?? []),
  ]
    .sort((a, b) => a.score - b.score || a.date.getTime() - b.date.getTime())
    .slice(0, 5);
  const nextSession = sessions.data?.find(
    (s) => ['PLANNED', 'IN_PROGRESS'].includes(s.status) && new Date(s.planned_at) >= now,
  );
  const loading =
    profile.isLoading ||
    subjects.isLoading ||
    schedules.isLoading ||
    assignments.isLoading ||
    exams.isLoading ||
    sessions.isLoading;
  if (loading)
    return <FeedbackState loading message="Preparing today’s overview." title="One moment" />;
  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <EditorialBackdrop />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.hero,
            { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
          ]}
        >
          <View style={[styles.heroGlow, { backgroundColor: palette.lavenderSoft }]} />
          <View style={[styles.heroBody, compact && styles.heroBodyCompact]}>
            <View style={styles.heroText}>
              <View style={styles.heroTop}>
                <MotionIcon
                  backgroundColor={palette.surface}
                  color={palette.accent}
                  iconSize={22}
                  loop
                  name="sparkles"
                  size={40}
                />
                <Text style={[styles.date, { color: palette.accentStrong }]}>
                  {format(now, 'EEEE, MMMM d')}
                </Text>
              </View>
              <Text style={[styles.greeting, { color: palette.text }]}>
                {greeting}, {name}
              </Text>
              <Text style={[styles.heroCopy, { color: palette.textMuted }]}>
                {upcoming[0]
                  ? `${upcoming[0].title} is ${formatDistanceToNow(upcoming[0].date, { addSuffix: true })}. You’ve got this.`
                  : 'Your study space is calm and clear today.'}
              </Text>
            </View>
            <View
              style={[
                styles.artStage,
                compact && styles.artStageCompact,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View style={[styles.artStripe, { backgroundColor: palette.lavenderSoft }]} />
              <Image
                accessibilityLabel="Study desk with notebook, pen, books, flowers and a pink bow"
                resizeMode="contain"
                source={require('../../../assets/images/editorial-study-hero.png')}
                style={styles.heroArt}
              />
              <Ionicons
                color={palette.lavender}
                name="sparkles"
                size={15}
                style={styles.artSparkle}
              />
              <Ionicons color={palette.accent} name="heart" size={10} style={styles.artHeart} />
              <View
                style={[
                  styles.seal,
                  { backgroundColor: palette.accentSoft, borderColor: palette.surface },
                ]}
              >
                <Ionicons color={palette.accentStrong} name="ribbon-outline" size={15} />
                <Text style={[styles.sealText, { color: palette.accentStrong }]}>
                  {'STUDY\nSWEETLY'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.quickActions}>
          <QuickAction
            color={palette.accent}
            icon="checkbox-outline"
            index="01"
            label="Activity"
            onPress={() => router.push('/assignments/create')}
            surface={palette.accentSoft}
            textColor={palette.text}
          />
          <QuickAction
            color={palette.lavender}
            icon="school-outline"
            index="02"
            label="Exam or quiz"
            onPress={() => router.push('/exams/create')}
            surface={palette.lavenderSoft}
            textColor={palette.text}
          />
          <QuickAction
            color={palette.warning}
            icon="book-outline"
            index="03"
            label="Study plan"
            onPress={() => router.push('/sessions/create-plan')}
            surface={palette.peachSoft}
            textColor={palette.text}
          />
        </View>
        <Section color={palette.text} index="01" tint={palette.lavenderSoft} title="Today">
          {todayClasses.map((item) => {
            const subject = bySubject.get(item.subject_id);
            const current = isClassCurrent(item.start_time, item.end_time, now);
            return (
              <EntityCard
                accent={subject?.color}
                badge={current ? 'NOW' : clock(item.start_time)}
                key={item.id}
                metadata={item.room || subject?.room}
                onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: item.id } })}
                subtitle={`${clock(item.start_time)}–${clock(item.end_time)}`}
                title={subject?.name ?? 'Class'}
              />
            );
          })}
          {!todayClasses.length ? (
            <FeedbackState message="No classes are scheduled today." title="A clear day" />
          ) : null}
        </Section>
        <Section color={palette.text} index="02" tint={palette.peachSoft} title="Coming up">
          {upcoming.map((item) => (
            <EntityCard
              accent={item.accent}
              badge={item.badge}
              key={`${item.href}-${item.id}`}
              onPress={() => router.push({ pathname: item.href, params: { id: item.id } })}
              subtitle={item.subtitle}
              title={item.title}
            />
          ))}
          {!upcoming.length ? (
            <FeedbackState
              message="Everything currently recorded is complete."
              title="You’re caught up"
            />
          ) : null}
        </Section>
        <Section
          color={palette.text}
          index="03"
          tint={palette.accentSoft}
          title="Continue studying"
        >
          {nextSession ? (
            <EntityCard
              accent={bySubject.get(nextSession.subject_id)?.color}
              badge={`${nextSession.planned_duration} MIN`}
              metadata={format(new Date(nextSession.planned_at), 'MMM d · h:mm a')}
              onPress={() =>
                router.push({ pathname: '/sessions/[id]', params: { id: nextSession.id } })
              }
              subtitle={bySubject.get(nextSession.subject_id)?.name}
              title={nextSession.topic}
            />
          ) : (
            <FeedbackState
              message="Generate a study plan from an upcoming exam."
              title="No active session"
            />
          )}
        </Section>
        <Section color={palette.text} index="04" tint={palette.lavenderSoft} title="This week">
          <View style={styles.stats}>
            <Stat
              color={palette.text}
              icon="checkmark"
              label="Tasks done"
              surface={palette.surface}
              value={
                assignments.data?.filter(
                  (a) =>
                    a.completed_at && isThisWeek(new Date(a.completed_at), { weekStartsOn: 1 }),
                ).length ?? 0
              }
            />
            <Stat
              color={palette.text}
              icon="hourglass-outline"
              label="Remaining"
              surface={palette.surface}
              value={assignments.data?.filter((a) => a.status !== 'COMPLETED').length ?? 0}
            />
            <Stat
              color={palette.text}
              icon="book-outline"
              label="Study sessions"
              surface={palette.surface}
              value={
                sessions.data?.filter(
                  (s) =>
                    s.status === 'COMPLETED' &&
                    isThisWeek(new Date(s.updated_at), { weekStartsOn: 1 }),
                ).length ?? 0
              }
            />
            <Stat
              color={palette.text}
              icon="school-outline"
              label="Upcoming exams"
              surface={palette.surface}
              value={exams.data?.filter((e) => e.status === 'UPCOMING').length ?? 0}
            />
          </View>
        </Section>
        <AppButton
          icon="color-palette-outline"
          label="Manage subjects"
          onPress={() => router.push('/subjects')}
          variant="secondary"
        />
      </ScrollView>
    </View>
  );
}
function Section({
  children,
  color,
  index,
  tint,
  title,
}: React.PropsWithChildren<{ color: string; index: string; tint: string; title: string }>) {
  return (
    <View style={[styles.section, { backgroundColor: tint }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionIndex, { color }]}>{index}</Text>
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        <Ionicons color={color} name="heart-outline" size={15} style={styles.sectionHeart} />
      </View>
      {children}
    </View>
  );
}
function QuickAction({
  color,
  icon,
  index,
  label,
  onPress,
  surface,
  textColor,
}: {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  index: string;
  label: string;
  onPress: () => void;
  surface: string;
  textColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: surface,
          opacity: pressed ? 0.76 : 1,
          transform: [{ translateY: pressed ? 3 : 0 }, { scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <Text style={[styles.quickIndex, { color }]}>{index}</Text>
      <MotionIcon
        backgroundColor="rgba(255,255,255,0.68)"
        color={color}
        iconSize={21}
        name={icon}
        size={42}
      />
      <Text numberOfLines={2} style={[styles.quickLabel, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}
function Stat({
  color,
  icon,
  label,
  surface,
  value,
}: {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  surface: string;
  value: number;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: surface }]}>
      <View style={styles.statTop}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Ionicons color={color} name={icon} size={17} />
      </View>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 920,
    paddingBottom: 124,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  hero: {
    borderRadius: radii.xl,
    borderWidth: 1,
    boxShadow: '0 18px 42px rgba(14, 27, 72, 0.10)',
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroGlow: {
    borderRadius: radii.pill,
    height: 180,
    opacity: 0.8,
    pointerEvents: 'none',
    position: 'absolute',
    right: -70,
    top: -70,
    width: 180,
  },
  heroBody: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  heroBodyCompact: { alignItems: 'stretch', flexDirection: 'column' },
  heroText: { flex: 1, gap: spacing.sm, zIndex: 2 },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  greeting: typography.title,
  date: { ...typography.label, flex: 1 },
  heroCopy: { ...typography.body, maxWidth: 620 },
  artStage: { borderRadius: radii.lg, borderWidth: 1, height: 205, overflow: 'hidden', width: 330 },
  artStageCompact: { height: 154, width: '100%' },
  artStripe: { bottom: 0, height: 34, left: 0, opacity: 0.75, position: 'absolute', right: 0 },
  heroArt: { height: '100%', position: 'absolute', right: -8, top: 0, width: '100%' },
  artSparkle: { position: 'absolute', right: 14, top: 12, transform: [{ rotate: '12deg' }] },
  artHeart: {
    opacity: 0.75,
    position: 'absolute',
    right: 39,
    top: 30,
    transform: [{ rotate: '-14deg' }],
  },
  seal: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 3,
    bottom: 9,
    height: 70,
    justifyContent: 'center',
    left: 9,
    position: 'absolute',
    transform: [{ rotate: '-8deg' }],
    width: 70,
  },
  sealText: {
    ...typography.label,
    fontSize: 7,
    letterSpacing: 0.8,
    lineHeight: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickAction: {
    alignItems: 'center',
    borderRadius: radii.lg,
    boxShadow: '0 8px 20px rgba(14, 27, 72, 0.06)',
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 116,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  quickIndex: {
    ...typography.label,
    fontSize: 8,
    left: spacing.sm,
    opacity: 0.65,
    position: 'absolute',
    top: spacing.sm,
  },
  quickLabel: { ...typography.caption, fontWeight: '700', lineHeight: 15, textAlign: 'center' },
  section: { borderRadius: radii.xl, gap: spacing.md, overflow: 'hidden', padding: spacing.lg },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  sectionIndex: { ...typography.label, fontSize: 9, opacity: 0.55 },
  sectionTitle: { ...typography.sectionTitle, fontSize: 24 },
  sectionHeart: { marginLeft: 'auto', opacity: 0.48, transform: [{ rotate: '12deg' }] },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: {
    borderRadius: radii.lg,
    boxShadow: '0 8px 22px rgba(14, 27, 72, 0.06)',
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 140,
    padding: spacing.lg,
  },
  statTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  statValue: { fontFamily: typography.title.fontFamily, fontSize: 32, fontWeight: '600' },
  statLabel: typography.caption,
});
