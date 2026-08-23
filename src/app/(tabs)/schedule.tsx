import { format, parse } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { days } from '@/components/schedule/ScheduleForm';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSchedules, useSubjects } from '@/hooks/useStudyData';

const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 28;       // was 46
const TIME_COLUMN_WIDTH = 52; // was 64
const DAY_COLUMN_WIDTH = 130; // was 150

const WEEK_DAYS = [
  { label: 'MON', value: 1 },
  { label: 'TUE', value: 2 },
  { label: 'WED', value: 3 },
  { label: 'THU', value: 4 },
  { label: 'FRI', value: 5 },
  { label: 'SAT', value: 6 },
];

const showTime = (value: string) =>
  format(
    parse(value, 'HH:mm:ss', new Date()),
    'h:mm a',
  );

function timeToMinutes(value: string) {
  const [hours = 0, minutes = 0] = value
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}

function minutesToLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return format(date, 'h:mm');
}

function roundDownToHour(minutes: number) {
  return Math.floor(minutes / 60) * 60;
}

function roundUpToHour(minutes: number) {
  return Math.ceil(minutes / 60) * 60;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const palette = useAppTheme();

  const schedules = useSchedules();
  const subjects = useSubjects();

  const [mode, setMode] =
    useState<'WEEK' | 'TODAY'>('WEEK');

  const subjectById = useMemo(
    () =>
      new Map(
        subjects.data?.map((subject) => [
          subject.id,
          subject,
        ]) ?? [],
      ),
    [subjects.data],
  );

  const today = new Date().getDay();

  const visible =
    schedules.data?.filter(
      (item) =>
        mode === 'WEEK' ||
        item.day_of_week === today,
    ) ?? [];

  /*
   * Work out the visible timetable range automatically.
   *
   * Example:
   * earliest class = 8:00
   * latest class = 17:30
   *
   * timetable becomes roughly 7:00–19:00.
   */
  const { startMinute, endMinute } =
    useMemo(() => {
      if (!visible.length) {
        return {
          startMinute: 7 * 60,
          endMinute: 18 * 60,
        };
      }

      const starts = visible.map((item) =>
        timeToMinutes(item.start_time),
      );

      const ends = visible.map((item) =>
        timeToMinutes(item.end_time),
      );

      const earliest = Math.min(...starts);
      const latest = Math.max(...ends);

      return {
        startMinute: Math.max(
          6 * 60,
          roundDownToHour(earliest - 60),
        ),

        endMinute: Math.min(
          22 * 60,
          roundUpToHour(latest + 60),
        ),
      };
    }, [visible]);

  const slotCount =
    (endMinute - startMinute) /
    SLOT_MINUTES;

  const timelineHeight =
    slotCount * SLOT_HEIGHT;

  const timeSlots = Array.from(
    { length: slotCount + 1 },
    (_, index) =>
      startMinute +
      index * SLOT_MINUTES,
  );

  /*
   * In Today mode we only show today's column.
   *
   * In Week mode we show Monday–Saturday.
   *
   * Sunday is also included automatically when
   * there is actually a Sunday class.
   */
  const displayedDays = useMemo(() => {
    if (mode === 'TODAY') {
      return [
        {
          label:
            days[today]
              ?.slice(0, 3)
              .toUpperCase() ?? 'TODAY',

          value: today,
        },
      ];
    }

    const hasSunday =
      schedules.data?.some(
        (item) =>
          item.day_of_week === 0,
      ) ?? false;

    return hasSunday
      ? [
          {
            label: 'SUN',
            value: 0,
          },
          ...WEEK_DAYS,
        ]
      : WEEK_DAYS;
  }, [
    mode,
    schedules.data,
    today,
  ]);

  const renderClass = (
    item: NonNullable<
      typeof schedules.data
    >[number],
  ) => {
    const subject =
      subjectById.get(
        item.subject_id,
      );

    const start =
      timeToMinutes(
        item.start_time,
      );

    const end =
      timeToMinutes(
        item.end_time,
      );

    const top =
      ((start - startMinute) /
        SLOT_MINUTES) *
      SLOT_HEIGHT;

    const duration =
      Math.max(
        SLOT_MINUTES,
        end - start,
      );

    const height =
      (duration / SLOT_MINUTES) *
      SLOT_HEIGHT;

    const accent =
      subject?.color ??
      palette.accentSolid;

    return (
      <Pressable
        accessibilityLabel={`${
          subject?.name ?? 'Class'
        }, ${showTime(
          item.start_time,
        )} to ${showTime(
          item.end_time,
        )}`}
        accessibilityRole="button"
        key={item.id}
        onPress={() =>
          router.push({
            pathname:
              '/schedule/[id]',
            params: {
              id: item.id,
            },
          })
        }
        style={({ pressed }) => [
          styles.classCard,
          {
            backgroundColor:
              accent,
            height: Math.max(
              42,
              height - 4,
            ),
            opacity: pressed
              ? 0.8
              : 1,
            top: top + 2,
          },
        ]}
      >
        <Text
          numberOfLines={
            height < 80 ? 2 : 3
          }
          style={
            styles.classTitle
          }
        >
          {subject?.name ??
            'Class'}
        </Text>

        {height >= 72 ? (
          <Text
            numberOfLines={1}
            style={
              styles.classTime
            }
          >
            {showTime(
              item.start_time,
            )}{' '}
            –{' '}
            {showTime(
              item.end_time,
            )}
          </Text>
        ) : null}

        {(item.room ||
          subject?.room) &&
        height >= 100 ? (
          <Text
            numberOfLines={1}
            style={
              styles.classRoom
            }
          >
            {item.room ||
              subject?.room}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <EntityList
      addLabel="Add class manually"
      description="Your recurring weekly class timetable."
      empty={
        !schedules.data?.length
      }
      emptyMessage="Add a class manually or upload your study load so today’s schedule appears on Home."
      error={schedules.error}
      loading={
        schedules.isLoading
      }
      onAdd={() =>
        router.push(
          '/schedule/create',
        )
      }
      onRefresh={() =>
        void Promise.all([
          schedules.refetch(),
          subjects.refetch(),
        ])
      }
      onSecondaryAdd={() =>
        router.push(
          '/subjects/import',
        )
      }
      refreshing={
        schedules.isRefetching
      }
      secondaryAddLabel="Upload study load"
      title="Schedule"
    >
      <ChoiceField
        choices={[
          {
            label: 'Week',
            value: 'WEEK',
          },
          {
            label: 'Today',
            value: 'TODAY',
          },
        ]}
        label="View"
        onChange={setMode}
        value={mode}
      />

      {visible.length ? (
        <View
          style={[
            styles.scheduleCard,
            {
              backgroundColor:
                palette.surface,
              borderColor:
                palette.border,
            },
          ]}
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={
              false
            }
          >
            <View>
              {/* Day headings */}
              <View
                style={
                  styles.headerRow
                }
              >
                <View
                  style={[
                    styles.timeHeader,
                    {
                      borderColor:
                        palette.border,
                    },
                  ]}
                />

                {displayedDays.map(
                  (day) => (
                    <View
                      key={day.value}
                      style={[
                        styles.dayHeader,
                        {
                          borderColor:
                            palette.border,
                          backgroundColor:
                            day.value ===
                            today
                              ? palette.accentSoft
                              : palette.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color:
                              day.value ===
                              today
                                ? palette.accentStrong
                                : palette.textMuted,
                          },
                        ]}
                      >
                        {
                          day.label
                        }
                      </Text>
                    </View>
                  ),
                )}
              </View>

              {/* Main timetable */}
              <View
                style={
                  styles.timelineRow
                }
              >
                {/* Time column */}
                <View
                  style={{
                    width:
                      TIME_COLUMN_WIDTH,
                  }}
                >
                  {timeSlots.map(
                    (
                      minutes,
                      index,
                    ) => {
                      const isHour =
                        minutes %
                          60 ===
                        0;

                      return (
                        <View
                          key={
                            minutes
                          }
                          style={{
                            height:
                              index ===
                              timeSlots.length -
                                1
                                ? 0
                                : SLOT_HEIGHT,
                            position:
                              'relative',
                          }}
                        >
                          {isHour ? (
                            <Text
                              style={[
                                styles.timeLabel,
                                {
                                  color:
                                    palette.textMuted,
                                },
                              ]}
                            >
                              {minutesToLabel(
                                minutes,
                              )}
                            </Text>
                          ) : null}
                        </View>
                      );
                    },
                  )}
                </View>

                {/* Day columns */}
                {displayedDays.map(
                  (day) => {
                    const dayClasses =
                      visible.filter(
                        (item) =>
                          item.day_of_week ===
                          day.value,
                      );

                    return (
                      <View
                        key={
                          day.value
                        }
                        style={[
                          styles.dayColumn,
                          {
                            borderColor:
                              palette.border,
                            height:
                              timelineHeight,
                          },
                        ]}
                      >
                        {/* horizontal time lines */}
                        {timeSlots
                          .slice(0, -1)
                          .map(
                            (
                              minutes,
                              index,
                            ) => {
                              const isHour =
                                minutes %
                                  60 ===
                                0;

                              return (
                                <View
                                  key={
                                    minutes
                                  }
                                  pointerEvents="none"
                                  style={[
                                    styles.gridLine,
                                    {
                                      borderTopColor:
                                        palette.border,
                                      opacity:
                                        isHour
                                          ? 0.8
                                          : 0.35,
                                      top:
                                        index *
                                        SLOT_HEIGHT,
                                    },
                                  ]}
                                />
                              );
                            },
                          )}

                        {dayClasses.map(
                          renderClass,
                        )}
                      </View>
                    );
                  },
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      ) : schedules.data
          ?.length ? (
        <FeedbackState
          message="No classes are scheduled today."
          title="A clear day"
        />
      ) : null}
    </EntityList>
  );
}

const styles =
  StyleSheet.create({
    scheduleCard: {
      borderRadius: radii.xl,
      borderWidth: 1,
      overflow: 'hidden',
      paddingBottom:
        spacing.md,
    },

    headerRow: {
      flexDirection: 'row',
    },

    timeHeader: {
      borderBottomWidth: 1,
      height: 54,
      width:
        TIME_COLUMN_WIDTH,
    },

    dayHeader: {
      alignItems: 'center',
      borderBottomWidth: 1,
      borderLeftWidth: 1,
      height: 54,
      justifyContent:
        'center',
      width:
        DAY_COLUMN_WIDTH,
    },

    dayText: {
      ...typography.label,
      fontWeight: '800',
      letterSpacing: 1.2,
    },

    timelineRow: {
      flexDirection: 'row',
    },

    timeLabel: {
      ...typography.caption,
      fontWeight: '700',
      position: 'absolute',
      right: 10,
      top: -8,
    },

    dayColumn: {
      borderLeftWidth: 1,
      position: 'relative',
      width:
        DAY_COLUMN_WIDTH,
    },

    gridLine: {
      borderTopWidth: 1,
      left: 0,
      position: 'absolute',
      right: 0,
    },

    classCard: {
      borderRadius: radii.md,
      left: 4,
      overflow: 'hidden',
      padding:
        spacing.sm,
      position: 'absolute',
      right: 4,

      /*
       * Web shadow.
       * If your project complains
       * about boxShadow, delete
       * this line.
       */
      boxShadow:
        '0 5px 14px rgba(14, 27, 72, 0.12)',
    },

    classTitle: {
      ...typography.label,
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 15,
    },

    classTime: {
      ...typography.caption,
      color:
        'rgba(255,255,255,0.90)',
      fontSize: 10,
      marginTop: 4,
    },

    classRoom: {
      ...typography.caption,
      color:
        'rgba(255,255,255,0.82)',
      fontSize: 10,
      marginTop: 2,
    },
  });