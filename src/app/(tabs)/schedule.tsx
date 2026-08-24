import {
  format,
  parse,
} from 'date-fns';
import {
  useRouter,
} from 'expo-router';
import {
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  days,
} from '@/components/schedule/ScheduleForm';
import {
  ChoiceField,
} from '@/components/ui/ChoiceField';
import {
  EntityList,
} from '@/components/ui/EntityList';
import {
  FeedbackState,
} from '@/components/ui/FeedbackState';

import {
  radii,
  spacing,
  typography,
} from '@/constants/theme';

import {
  useAppTheme,
} from '@/hooks/useAppTheme';

import {
  useSchedules,
  useSubjects,
} from '@/hooks/useStudyData';

const SLOT_MINUTES =
  30;

const SLOT_HEIGHT =
  28;

const TIME_COLUMN_WIDTH =
  52;

const DAY_COLUMN_WIDTH =
  130;

const WEEK_DAYS = [
  {
    label:
      'MON',
    value:
      1,
  },

  {
    label:
      'TUE',
    value:
      2,
  },

  {
    label:
      'WED',
    value:
      3,
  },

  {
    label:
      'THU',
    value:
      4,
  },

  {
    label:
      'FRI',
    value:
      5,
  },

  {
    label:
      'SAT',
    value:
      6,
  },
];

const showTime = (
  value:
    string,
) =>
  format(
    parse(
      value,
      'HH:mm:ss',
      new Date(),
    ),

    'h:mm a',
  );

function timeToMinutes(
  value:
    string,
) {
  const [
    hours = 0,
    minutes = 0,
  ] =
    value
      .split(':')
      .map(
        Number,
      );

  return (
    hours *
      60 +
    minutes
  );
}

function minutesToLabel(
  totalMinutes:
    number,
) {
  const hours =
    Math.floor(
      totalMinutes /
        60,
    );

  const minutes =
    totalMinutes %
    60;

  const date =
    new Date();

  date.setHours(
    hours,
    minutes,
    0,
    0,
  );

  return format(
    date,
    'h:mm',
  );
}

function roundDownToHour(
  minutes:
    number,
) {
  return (
    Math.floor(
      minutes /
        60,
    ) *
    60
  );
}

function roundUpToHour(
  minutes:
    number,
) {
  return (
    Math.ceil(
      minutes /
        60,
    ) *
    60
  );
}

function readableTextColor(
  background:
    string,
) {
  const match =
    /^#([\dA-F]{6})$/i.exec(
      background,
    );

  if (!match) {
    return '#FFFFFF';
  }

  const value =
    Number.parseInt(
      match[1],
      16,
    );

  const red =
    (value >> 16) &
    255;

  const green =
    (value >> 8) &
    255;

  const blue =
    value &
    255;

  const luminance =
    (red * 299 +
      green * 587 +
      blue * 114) /
    1000;

  return luminance >
    156
    ? '#0E1F2F'
    : '#FFFFFF';
}

export default function ScheduleScreen() {
  const router =
    useRouter();

  const palette =
    useAppTheme();

  const schedules =
    useSchedules();

  const subjects =
    useSubjects();

  const [
    mode,
    setMode,
  ] =
    useState<
      | 'WEEK'
      | 'TODAY'
    >(
      'WEEK',
    );

  const subjectById =
    useMemo(
      () =>
        new Map(
          subjects.data?.map(
            (
              subject,
            ) => [
              subject.id,
              subject,
            ],
          ) ??
            [],
        ),

      [
        subjects.data,
      ],
    );

  const today =
    new Date().getDay();

  const visible =
    useMemo(
      () =>
        schedules.data?.filter(
          (
            item,
          ) =>
            mode ===
              'WEEK' ||
            item.day_of_week ===
              today,
        ) ??
        [],

      [
        mode,
        schedules.data,
        today,
      ],
    );

  const {
    startMinute,
    endMinute,
  } =
    useMemo(
      () => {
        if (
          !visible.length
        ) {
          return {
            endMinute:
              18 *
              60,

            startMinute:
              7 *
              60,
          };
        }

        const starts =
          visible.map(
            (
              item,
            ) =>
              timeToMinutes(
                item.start_time,
              ),
          );

        const ends =
          visible.map(
            (
              item,
            ) =>
              timeToMinutes(
                item.end_time,
              ),
          );

        const earliest =
          Math.min(
            ...starts,
          );

        const latest =
          Math.max(
            ...ends,
          );

        return {
          startMinute:
            Math.max(
              0,

              roundDownToHour(
                earliest -
                  60,
              ),
            ),

          endMinute:
            Math.min(
              24 *
                60,

              roundUpToHour(
                latest +
                  60,
              ),
            ),
        };
      },

      [
        visible,
      ],
    );

  const slotCount =
    (endMinute -
      startMinute) /
    SLOT_MINUTES;

  const timelineHeight =
    slotCount *
    SLOT_HEIGHT;

  const timeSlots =
    Array.from(
      {
        length:
          slotCount +
          1,
      },

      (
        _,
        index,
      ) =>
        startMinute +
        index *
          SLOT_MINUTES,
    );

  const displayedDays =
    useMemo(
      () => {
        if (
          mode ===
          'TODAY'
        ) {
          return [
            {
              label:
                days[
                  today
                ]
                  ?.slice(
                    0,
                    3,
                  )
                  .toUpperCase() ??
                'TODAY',

              value:
                today,
            },
          ];
        }

        const hasSunday =
          schedules.data?.some(
            (
              item,
            ) =>
              item.day_of_week ===
              0,
          ) ??
          false;

        return hasSunday
          ? [
              {
                label:
                  'SUN',

                value:
                  0,
              },

              ...WEEK_DAYS,
            ]
          : WEEK_DAYS;
      },

      [
        mode,
        schedules.data,
        today,
      ],
    );

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
      ((start -
        startMinute) /
        SLOT_MINUTES) *
      SLOT_HEIGHT;

    const duration =
      Math.max(
        SLOT_MINUTES,
        end -
          start,
      );

    /*
     * This is the natural timetable
     * height before minimum card sizing.
     */
    const rawHeight =
      (duration /
        SLOT_MINUTES) *
      SLOT_HEIGHT;

    /*
     * Every card has enough physical
     * height to display both:
     *
     * subject
     * time
     */
    const cardHeight =
      Math.max(
        46,
        rawHeight -
          4,
      );

    const compactCard =
      rawHeight <
      72;

    const accent =
      subject?.color ??
      palette.accentSolid;

    const cardTextColor =
      readableTextColor(
        accent,
      );

    return (
      <Pressable
        accessibilityLabel={`${
          subject?.name ??
          'Class'
        }, ${showTime(
          item.start_time,
        )} to ${showTime(
          item.end_time,
        )}`}
        accessibilityRole="button"
        key={
          item.id
        }
        onPress={() =>
          router.push({
            pathname:
              '/schedule/[id]',

            params: {
              id:
                item.id,
            },
          })
        }
        style={({ pressed }) => [
          styles.classCard,

          compactCard &&
            styles.classCardCompact,

          {
            backgroundColor:
              accent,

            height:
              cardHeight,

            opacity:
              pressed
                ? 0.8
                : 1,

            top:
              top +
              2,
          },
        ]}
      >
        <Text
          numberOfLines={
            compactCard
              ? 1
              : 2
          }
          style={[
            styles.classTitle,

            compactCard &&
              styles.classTitleCompact,

            {
              color:
                cardTextColor,
            },
          ]}
        >
          {subject?.name ??
            'Class'}
        </Text>

        {/*
         * FIX:
         *
         * Time is ALWAYS rendered now.
         * We only shrink the typography
         * for shorter classes.
         */}
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.classTime,

            compactCard &&
              styles.classTimeCompact,

            {
              backgroundColor:
                cardTextColor ===
                '#FFFFFF'
                  ? 'rgba(14,31,47,0.20)'
                  : 'rgba(255,255,255,0.48)',

              color:
                cardTextColor,
            },
          ]}
        >
          {showTime(
            item.start_time,
          )}
          {'–'}
          {showTime(
            item.end_time,
          )}
        </Text>

        {(item.room ||
          subject?.room) &&
        !compactCard &&
        rawHeight >=
          90 ? (
          <Text
            numberOfLines={
              1
            }
            style={
              [
                styles.classRoom,

                {
                  color:
                    cardTextColor,
                },
              ]
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
        !schedules.data
          ?.length
      }
      emptyMessage="Add a class manually or upload your study load so today’s schedule appears on Home."
      error={
        schedules.error
      }
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
            label:
              'Week',

            value:
              'WEEK',
          },

          {
            label:
              'Today',

            value:
              'TODAY',
          },
        ]}
        label="View"
        onChange={
          setMode
        }
        value={
          mode
        }
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
              {/* DAY HEADERS */}

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
                  (
                    day,
                  ) => (
                    <View
                      key={
                        day.value
                      }
                      style={[
                        styles.dayHeader,
                        {
                          backgroundColor:
                            day.value ===
                            today
                              ? palette.accentSoft
                              : palette.surface,

                          borderColor:
                            palette.border,
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

              {/* TIMELINE */}

              <View
                style={
                  styles.timelineRow
                }
              >
                {/* TIME COLUMN */}

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

                {/* DAYS */}

                {displayedDays.map(
                  (
                    day,
                  ) => {
                    const dayClasses =
                      visible.filter(
                        (
                          item,
                        ) =>
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
                        {/* GRID LINES */}

                        {timeSlots
                          .slice(
                            0,
                            -1,
                          )
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
      borderRadius:
        radii.xl,

      borderWidth:
        1,

      overflow:
        'hidden',

      paddingBottom:
        spacing.md,
    },

    headerRow: {
      flexDirection:
        'row',
    },

    timeHeader: {
      borderBottomWidth:
        1,

      height:
        54,

      width:
        TIME_COLUMN_WIDTH,
    },

    dayHeader: {
      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderLeftWidth:
        1,

      height:
        54,

      justifyContent:
        'center',

      width:
        DAY_COLUMN_WIDTH,
    },

    dayText: {
      ...typography.label,

      fontSize:
        9,

      fontWeight:
        '800',

      letterSpacing:
        1.1,
    },

    timelineRow: {
      flexDirection:
        'row',
    },

    timeLabel: {
      ...typography.caption,

      fontSize:
        9,

      fontWeight:
        '700',

      position:
        'absolute',

      right:
        8,

      top:
        -7,
    },

    dayColumn: {
      borderLeftWidth:
        1,

      position:
        'relative',

      width:
        DAY_COLUMN_WIDTH,
    },

    gridLine: {
      borderTopWidth:
        1,

      left:
        0,

      position:
        'absolute',

      right:
        0,
    },

    classCard: {
      borderRadius:
        10,

      left:
        4,

      overflow:
        'hidden',

      paddingHorizontal:
        8,

      paddingVertical:
        6,

      position:
        'absolute',

      right:
        4,
    },

    classCardCompact: {
      borderRadius:
        8,

      paddingHorizontal:
        6,

      paddingVertical:
        5,
    },

    classTitle: {
      ...typography.label,

      color:
        '#FFFFFF',

      fontSize:
        11,

      fontWeight:
        '800',

      lineHeight:
        14,
    },

    classTitleCompact: {
      fontSize:
        9,

      lineHeight:
        11,
    },

    classTime: {
      ...typography.caption,

      alignSelf:
        'flex-start',

      borderRadius:
        radii.pill,

      fontSize:
        9,

      fontWeight:
        '700',

      lineHeight:
        12,

      marginTop:
        2,

      overflow:
        'hidden',

      paddingHorizontal:
        4,

      paddingVertical:
        1,
    },

    classTimeCompact: {
      fontSize:
        7,

      lineHeight:
        9,

      marginTop:
        1,
    },

    classRoom: {
      ...typography.caption,

      color:
        'rgba(255,255,255,0.82)',

      fontSize:
        8,

      lineHeight:
        11,

      marginTop:
        2,
    },
  });
