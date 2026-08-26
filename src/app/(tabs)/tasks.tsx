import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAssistantScreenContext } from '@/components/assistant/AssistantProvider';
import { EntityList } from '@/components/ui/EntityList';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAssignments, useExams, useSubjects } from '@/hooks/useStudyData';

const TASK_COLORS = {
  ASSIGNMENT: '#4F7FD8',
  QUIZ: '#4FAE78',
  EXAM: '#D95C5C',
} as const;

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  color: string;
  kind: 'ASSIGNMENT' | 'QUIZ' | 'EXAM';
  completed?: boolean;
  cancelled?: boolean;
  overdue?: boolean;
  onPress: () => void;
};

const DAY_WIDTH_FALLBACK = 122;
const DAY_WIDTH_MIN = 40;
const DAY_WIDTH_MAX = 140;
const MAX_EVENTS = 4;

const WEEK_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function TasksScreen() {
  const router = useRouter();
  const palette = useAppTheme();

  const assignments = useAssignments();
  const exams = useExams();
  const subjects = useSubjects();

  useAssistantScreenContext(useMemo(() => ({ type: 'task', label: 'Tasks' }), []));

  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [calendarWidth, setCalendarWidth] = useState(0);

  const dayWidth = calendarWidth
    ? Math.min(DAY_WIDTH_MAX, Math.max(DAY_WIDTH_MIN, Math.floor(calendarWidth / 7)))
    : DAY_WIDTH_FALLBACK;

  const events = useMemo<CalendarEvent[]>(() => {
    const assignmentEvents =
      assignments.data?.map((item) => {
        const date = new Date(item.due_at);

        const completed = item.status === 'COMPLETED';
        const cancelled = item.status === 'CANCELLED';

        return {
          id: `assignment-${item.id}`,
          title: item.title,
          date,
          kind: 'ASSIGNMENT' as const,
          color: TASK_COLORS.ASSIGNMENT,
          completed,
          cancelled,
          overdue: !completed && !cancelled && isBefore(date, new Date()),

          onPress: () =>
            router.push({
              pathname: '/assignments/[id]',
              params: {
                id: item.id,
              },
            }),
        };
      }) ?? [];

    const examEvents =
      exams.data?.map((item) => {
        const isQuiz = item.type === 'QUIZ';
        const cancelled = item.status === 'CANCELLED';

        return {
          id: `exam-${item.id}`,
          title: item.title,
          date: new Date(item.exam_at),

          kind: isQuiz ? ('QUIZ' as const) : ('EXAM' as const),

          color: isQuiz ? TASK_COLORS.QUIZ : TASK_COLORS.EXAM,
          cancelled,

          onPress: () =>
            router.push({
              pathname: '/exams/[id]',
              params: {
                id: item.id,
              },
            }),
        };
      }) ?? [];

    return [...assignmentEvents, ...examEvents];
  }, [assignments.data, exams.data, router]);

  const calendarDays = useMemo(() => {
    const beginning = startOfWeek(startOfMonth(month), {
      weekStartsOn: 0,
    });

    const ending = endOfWeek(endOfMonth(month), {
      weekStartsOn: 0,
    });

    return eachDayOfInterval({
      start: beginning,
      end: ending,
    });
  }, [month]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];

    for (let index = 0; index < calendarDays.length; index += 7) {
      result.push(calendarDays.slice(index, index + 7));
    }

    return result;
  }, [calendarDays]);

  const eventsForDay = (day: Date) =>
    events
      .filter((event) => isSameDay(event.date, day))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <EntityList
      addLabel="Add assignment"
      description="Assignments, quizzes, and exams across your month."
      empty={false}
      emptyMessage=""
      error={assignments.error ?? exams.error}
      loading={assignments.isLoading || exams.isLoading}
      onAdd={() => router.push('/assignments/create')}
      onRefresh={() =>
        void Promise.all([assignments.refetch(), exams.refetch(), subjects.refetch()])
      }
      onSecondaryAdd={() => router.push('/exams/create')}
      refreshing={assignments.isRefetching || exams.isRefetching}
      secondaryAddIcon="school-outline"
      secondaryAddLabel="Add quiz or exam"
      title="Tasks"
    >
      {/* MONTH NAVIGATION */}
      <View style={styles.monthNavigation}>
        <Pressable
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          onPress={() => setMonth((current) => subMonths(current, 1))}
          style={[
            styles.monthButton,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
            },
          ]}
        >
          <Text
            style={[
              styles.monthArrow,
              {
                color: palette.text,
              },
            ]}
          >
            ‹
          </Text>
        </Pressable>

        <Pressable
          accessibilityHint="Returns the calendar to the current month"
          accessibilityLabel={`${format(month, 'MMMM yyyy')}. Return to current month`}
          accessibilityRole="button"
          onPress={() => setMonth(startOfMonth(new Date()))}
          style={styles.monthTitleArea}
        >
          <Text
            style={[
              styles.monthTitle,
              {
                color: palette.text,
              },
            ]}
          >
            {format(month, 'MMMM yyyy')}
          </Text>

          <Text
            style={[
              styles.todayHint,
              {
                color: palette.textMuted,
              },
            ]}
          >
            Tap to return to this month
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() => setMonth((current) => addMonths(current, 1))}
          style={[
            styles.monthButton,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
            },
          ]}
        >
          <Text
            style={[
              styles.monthArrow,
              {
                color: palette.text,
              },
            ]}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {/* LEGEND */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: TASK_COLORS.ASSIGNMENT,
              },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              {
                color: palette.textMuted,
              },
            ]}
          >
            Assignment
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: TASK_COLORS.QUIZ,
              },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              {
                color: palette.textMuted,
              },
            ]}
          >
            Quiz
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: TASK_COLORS.EXAM,
              },
            ]}
          />
          <Text
            style={[
              styles.legendText,
              {
                color: palette.textMuted,
              },
            ]}
          >
            Exam
          </Text>
        </View>
      </View>

      {/* CALENDAR */}
      <View
        onLayout={(event) => setCalendarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.calendarShell,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <View>
          {/* DAYS */}
          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((day) => (
              <View
                key={day}
                style={[
                  styles.weekHeaderCell,
                  {
                    borderColor: palette.border,
                    width: dayWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.weekDay,
                    {
                      color: palette.textMuted,
                    },
                  ]}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* WEEKS */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day) => {
                const dayEvents = eventsForDay(day);

                const visibleEvents = dayEvents.slice(0, MAX_EVENTS);

                const hiddenCount = Math.max(0, dayEvents.length - MAX_EVENTS);

                const currentMonth = isSameMonth(day, month);

                const today = isSameDay(day, new Date());

                return (
                  <View
                    key={day.toISOString()}
                    style={[
                      styles.dayCell,
                      {
                        borderColor: palette.border,

                        backgroundColor: currentMonth ? palette.surface : palette.surfaceAlt,

                        width: dayWidth,
                      },
                    ]}
                  >
                    {/* DATE NUMBER */}
                    <View style={styles.dayNumberRow}>
                      <View
                        style={[
                          styles.dayNumberBubble,

                          today
                            ? {
                                backgroundColor: palette.accentSolid,
                              }
                            : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            {
                              color: today
                                ? '#FFFFFF'
                                : currentMonth
                                  ? palette.text
                                  : palette.textMuted,
                            },
                          ]}
                        >
                          {format(day, 'd')}
                        </Text>
                      </View>
                    </View>

                    {/* EVENTS */}
                    <View style={styles.events}>
                      {visibleEvents.map((event) => (
                        <Pressable
                          accessibilityLabel={`${event.kind === 'QUIZ' ? 'Quiz' : event.kind === 'EXAM' ? 'Exam' : 'Assignment'}: ${event.title}${event.completed ? ', completed' : event.cancelled ? ', cancelled' : event.overdue ? ', overdue' : ''}`}
                          accessibilityRole="button"
                          key={event.id}
                          onPress={event.onPress}
                          style={({ pressed }) => [
                            styles.event,

                            {
                              backgroundColor: event.color,

                              opacity:
                                event.completed || event.cancelled ? 0.45 : pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.eventText,

                              event.completed || event.cancelled ? styles.completedText : null,
                            ]}
                          >
                            {event.title}
                          </Text>

                          {event.overdue ? <View style={styles.overdueDot} /> : null}
                        </Pressable>
                      ))}

                      {hiddenCount > 0 ? (
                        <Text
                          style={[
                            styles.moreText,
                            {
                              color: palette.textMuted,
                            },
                          ]}
                        >
                          +{hiddenCount} more
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottomSpace} />
    </EntityList>
  );
}

const styles = StyleSheet.create({
  monthNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },

  monthButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },

  monthArrow: {
    fontSize: 28,
    lineHeight: 30,
  },

  monthTitleArea: {
    alignItems: 'center',
    flex: 1,
  },

  monthTitle: {
    ...typography.sectionTitle,
    fontSize: 21,
  },

  todayHint: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
  },

  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },

  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  legendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },

  legendText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },

  calendarShell: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },

  weekHeader: {
    flexDirection: 'row',
  },

  weekHeaderCell: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    height: 40,
    justifyContent: 'center',
  },

  weekDay: {
    ...typography.label,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  weekRow: {
    flexDirection: 'row',
  },

  dayCell: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    minHeight: 112,
    padding: 5,
  },

  dayNumberRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },

  dayNumberBubble: {
    alignItems: 'center',
    borderRadius: 15,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },

  dayNumber: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },

  events: {
    gap: 3,
  },

  event: {
    borderRadius: 5,
    justifyContent: 'center',
    minHeight: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'relative',
  },

  eventText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
    paddingRight: 5,
  },

  completedText: {
    textDecorationLine: 'line-through',
  },

  overdueDot: {
    backgroundColor: '#7A1E1E',
    borderColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    height: 7,
    position: 'absolute',
    right: 3,
    top: 3,
    width: 7,
  },

  moreText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 3,
    marginTop: 1,
  },

  bottomSpace: {
    height: spacing.md,
  },
});
