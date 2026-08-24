import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useMutation,
} from '@tanstack/react-query';
import {
  format,
} from 'date-fns';
import {
  useRouter,
} from 'expo-router';
import {
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AppButton,
} from '@/components/ui/AppButton';
import {
  EntityCard,
} from '@/components/ui/EntityCard';
import {
  EntityList,
} from '@/components/ui/EntityList';
import {
  FeedbackState,
} from '@/components/ui/FeedbackState';
import {
  MotionIcon,
} from '@/components/ui/MotionIcon';

import {
  radii,
  spacing,
  typography,
} from '@/constants/theme';

import {
  useMaterials,
  useNotes,
  useSessions,
  useSubjects,
} from '@/hooks/useStudyData';

import {
  useAppTheme,
} from '@/hooks/useAppTheme';
import {
  getErrorMessage,
} from '@/lib/errors';
import {
  pdfReadingProgress,
} from '@/lib/pdf/progress';

import {
  deleteMaterial as deleteMaterialService,
  deleteRecord,
} from '@/services';

type LibraryFilter =
  | 'ALL'
  | 'MATERIALS'
  | 'NOTES';

export default function StudyScreen() {
  const router =
    useRouter();

  const palette =
    useAppTheme();

  const {
    width,
    height,
  } =
    useWindowDimensions();

  /*
   * IMPORTANT:
   *
   * Landscape gets its own layout.
   * iPad portrait will NOT accidentally
   * use desktop sidebar layout anymore.
   */
  const landscape =
    width >
    height;

  const splitLandscape =
    landscape &&
    width >=
      1024 &&
    height >=
      600;

  const shortLandscape =
    landscape &&
    height <
      600;

  const compact =
    !splitLandscape &&
    (width <
      900 ||
      shortLandscape);

  const phone =
    width <
    600;

  const materials =
    useMaterials();

  const notes =
    useNotes();

  const sessions =
    useSessions();

  const subjects =
    useSubjects();

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] =
    useState<
      string | null
    >(null);

  const [
    filter,
    setFilter,
  ] =
    useState<LibraryFilter>(
      'ALL',
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const bySubject =
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

  const loading =
    materials.isLoading ||
    notes.isLoading ||
    sessions.isLoading ||
    subjects.isLoading;

  const continueMaterial =
    useMemo(
      () =>
        materials.data
          ?.filter(
            (
              item,
            ) =>
              item.type ===
                'PDF' &&
              item.file_url &&
              item.last_opened_at &&
              !item.completed,
          )
          .sort(
            (
              a,
              b,
            ) =>
              new Date(
                b.last_opened_at!,
              ).getTime() -
              new Date(
                a.last_opened_at!,
              ).getTime(),
          )[0],

      [
        materials.data,
      ],
    );

  const plannedSessions =
    useMemo(
      () =>
        sessions.data
          ?.filter(
            (
              item,
            ) =>
              item.status ===
                'PLANNED' ||
              item.status ===
                'IN_PROGRESS',
          )
          .slice(
            0,
            4,
          ) ??
        [],

      [
        sessions.data,
      ],
    );

  const selectedSubject =
    selectedSubjectId
      ? bySubject.get(
          selectedSubjectId,
        )
      : undefined;

  const removeMaterial =
    useMutation({
      mutationFn:
        ({
          id,
          path,
        }: {
          id:
            string;

          path?:
            | string
            | null;
        }) =>
          deleteMaterialService(
            id,
            path,
          ),

      onSuccess:
        async () => {
          await Promise.all([
            materials.refetch(),
            notes.refetch(),
          ]);
        },

      onError:
        (
          error,
        ) => {
          Alert.alert(
            'Could not delete material',
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const removeNote =
    useMutation({
      mutationFn:
        (
          id:
            string,
        ) =>
          deleteRecord(
            'notes',
            id,
          ),

      onSuccess:
        async () => {
          await notes.refetch();
        },

      onError:
        (
          error,
        ) => {
          Alert.alert(
            'Could not delete note',
            getErrorMessage(
              error,
            ),
          );
        },
    });

  const openMaterial = (
    item: NonNullable<
      typeof materials.data
    >[number],
  ) => {
    if (
      item.type ===
        'PDF' &&
      item.file_url
    ) {
      router.push(
        `/materials/${item.id}/reader` as never,
      );

      return;
    }

    router.push({
      pathname:
        '/materials/[id]',

      params: {
        id:
          item.id,
      },
    });
  };

  const openNote = (
    item: NonNullable<
      typeof notes.data
    >[number],
  ) => {
    if (
      item.material_id &&
      item.page_number
    ) {
      router.push({
        pathname:
          '/materials/[id]/reader',

        params: {
          id:
            item.material_id,

          page:
            String(
              item.page_number,
            ),
        },
      });

      return;
    }

    router.push({
      pathname:
        '/notes/[id]',

      params: {
        id:
          item.id,
      },
    });
  };

  const confirmDeleteMaterial = (
    item: NonNullable<
      typeof materials.data
    >[number],
  ) => {
    const performDelete =
      () => {
        removeMaterial.mutate({
          id:
            item.id,

          path:
            item.file_url,
        });
      };

    const message =
      `Delete "${item.title}"? This cannot be undone.`;

    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      if (
        window.confirm(
          message,
        )
      ) {
        performDelete();
      }

      return;
    }

    Alert.alert(
      'Delete material?',
      message,
      [
        {
          style:
            'cancel',
          text:
            'Cancel',
        },
        {
          onPress:
            performDelete,
          style:
            'destructive',
          text:
            'Delete',
        },
      ],
    );
  };

  const confirmDeleteNote = (
    item: NonNullable<
      typeof notes.data
    >[number],
  ) => {
    const title =
      item.title ??
      `Page ${
        item.page_number ??
        '—'
      } note`;

    const performDelete =
      () => {
        removeNote.mutate(
          item.id,
        );
      };

    const message =
      `Delete "${title}"? This cannot be undone.`;

    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      if (
        window.confirm(
          message,
        )
      ) {
        performDelete();
      }

      return;
    }

    Alert.alert(
      'Delete note?',
      message,
      [
        {
          style:
            'cancel',
          text:
            'Cancel',
        },
        {
          onPress:
            performDelete,
          style:
            'destructive',
          text:
            'Delete',
        },
      ],
    );
  };

  const openFolder = (
    subjectId:
      string,
  ) => {
    setSelectedSubjectId(
      subjectId,
    );

    setFilter(
      'ALL',
    );

    setSearch('');
  };

  const closeFolder =
    () => {
      setSelectedSubjectId(
        null,
      );

      setFilter(
        'ALL',
      );

      setSearch('');
    };

  const getFolderCounts = (
    subjectId:
      string,
  ) => {
    const materialCount =
      materials.data?.filter(
        (
          item,
        ) =>
          item.subject_id ===
          subjectId,
      ).length ??
      0;

    const noteCount =
      notes.data?.filter(
        (
          item,
        ) =>
          item.subject_id ===
          subjectId,
      ).length ??
      0;

    return {
      materialCount,
      noteCount,

      total:
        materialCount +
        noteCount,
    };
  };

  const folderMaterials =
    useMemo(
      () =>
        selectedSubjectId
          ? materials.data?.filter(
              (
                item,
              ) =>
                item.subject_id ===
                selectedSubjectId,
            ) ??
            []
          : [],

      [
        materials.data,
        selectedSubjectId,
      ],
    );

  const folderNotes =
    useMemo(
      () =>
        selectedSubjectId
          ? notes.data?.filter(
              (
                item,
              ) =>
                item.subject_id ===
                selectedSubjectId,
            ) ??
            []
          : [],

      [
        notes.data,
        selectedSubjectId,
      ],
    );

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filteredMaterials =
    folderMaterials.filter(
      (
        item,
      ) => {
        if (
          filter ===
          'NOTES'
        ) {
          return false;
        }

        if (
          !normalizedSearch
        ) {
          return true;
        }

        return [
          item.title,
          item.description,
          item.file_name,
          item.type,
        ]
          .filter(
            Boolean,
          )
          .join(
            ' ',
          )
          .toLowerCase()
          .includes(
            normalizedSearch,
          );
      },
    );

  const filteredNotes =
    folderNotes.filter(
      (
        item,
      ) => {
        if (
          filter ===
          'MATERIALS'
        ) {
          return false;
        }

        if (
          !normalizedSearch
        ) {
          return true;
        }

        return [
          item.title,
          item.content,
        ]
          .filter(
            Boolean,
          )
          .join(
            ' ',
          )
          .toLowerCase()
          .includes(
            normalizedSearch,
          );
      },
    );

  const resultCount =
    filteredMaterials.length +
    filteredNotes.length;

  const renderSidebar =
    () => (
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor:
              palette.surface,

            borderColor:
              palette.border,
          },
        ]}
      >
        <View
          style={
            styles.sidebarHeader
          }
        >
          <View
            style={[
              styles.sidebarIcon,
              {
                backgroundColor:
                  palette.accentSoft,
              },
            ]}
          >
            <Ionicons
              color={
                palette.accentStrong
              }
              name="folder-open-outline"
              size={
                18
              }
            />
          </View>

          <View
            style={
              styles.sidebarHeaderCopy
            }
          >
            <Text
              style={[
                styles.sidebarTitle,
                {
                  color:
                    palette.text,
                },
              ]}
            >
              Folders
            </Text>

            <Text
              style={[
                styles.sidebarCaption,
                {
                  color:
                    palette.textMuted,
                },
              ]}
            >
              {
                subjects.data
                  ?.length ??
                0
              }{' '}
              subjects
            </Text>
          </View>
        </View>

        <Pressable
          onPress={
            closeFolder
          }
          style={[
            styles.sidebarRow,
            {
              backgroundColor:
                !selectedSubjectId
                  ? palette.accentSoft
                  : 'transparent',
            },
          ]}
        >
          <Ionicons
            color={
              !selectedSubjectId
                ? palette.accentStrong
                : palette.textMuted
            }
            name="grid-outline"
            size={
              17
            }
          />

          <Text
            numberOfLines={
              1
            }
            style={[
              styles.sidebarRowText,
              {
                color:
                  !selectedSubjectId
                    ? palette.accentStrong
                    : palette.text,
              },
            ]}
          >
            Overview
          </Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={
            styles.sidebarFolders
          }
          nestedScrollEnabled
          showsVerticalScrollIndicator={
            false
          }
        >
          {subjects.data?.map(
            (
              subject,
            ) => {
              const active =
                selectedSubjectId ===
                subject.id;

              const counts =
                getFolderCounts(
                  subject.id,
                );

              return (
                <Pressable
                  key={
                    subject.id
                  }
                  onPress={() =>
                    openFolder(
                      subject.id,
                    )
                  }
                  style={[
                    styles.sidebarRow,
                    {
                      backgroundColor:
                        active
                          ? palette.accentSoft
                          : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.folderDot,
                      {
                        backgroundColor:
                          subject.color ??
                          palette.accent,
                      },
                    ]}
                  />

                  <Text
                    numberOfLines={
                      1
                    }
                    style={[
                      styles.sidebarRowText,
                      {
                        color:
                          active
                            ? palette.accentStrong
                            : palette.text,
                      },
                    ]}
                  >
                    {
                      subject.name
                    }
                  </Text>

                  <Text
                    style={[
                      styles.sidebarCount,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    {
                      counts.total
                    }
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>

        <Pressable
          onPress={() =>
            router.push(
              '/subjects',
            )
          }
          style={[
            styles.manageFolders,
            {
              borderTopColor:
                palette.border,
            },
          ]}
        >
          <Ionicons
            color={
              palette.textMuted
            }
            name="settings-outline"
            size={
              15
            }
          />

          <Text
            style={[
              styles.manageFoldersText,
              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            Manage subjects
          </Text>
        </Pressable>
      </View>
    );

  const renderMobileFolders =
    () => (
      <ScrollView
        contentContainerStyle={
          styles.mobileFolders
        }
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
      >
        <Pressable
          onPress={
            closeFolder
          }
          style={[
            styles.mobileFolderChip,

            compact &&
              styles.mobileFolderChipCompact,

            {
              backgroundColor:
                !selectedSubjectId
                  ? palette.accentSoft
                  : palette.surface,

              borderColor:
                !selectedSubjectId
                  ? palette.accent
                  : palette.border,
            },
          ]}
        >
          <Ionicons
            color={
              !selectedSubjectId
                ? palette.accentStrong
                : palette.textMuted
            }
            name="grid-outline"
            size={
              15
            }
          />

          <Text
            style={[
              styles.mobileFolderText,
              {
                color:
                  !selectedSubjectId
                    ? palette.accentStrong
                    : palette.text,
              },
            ]}
          >
            Overview
          </Text>
        </Pressable>

        {subjects.data?.map(
          (
            subject,
          ) => {
            const active =
              selectedSubjectId ===
              subject.id;

            const counts =
              getFolderCounts(
                subject.id,
              );

            return (
              <Pressable
                key={
                  subject.id
                }
                onPress={() =>
                  openFolder(
                    subject.id,
                  )
                }
                style={[
                  styles.mobileFolderChip,

                  compact &&
                    styles.mobileFolderChipCompact,

                  {
                    backgroundColor:
                      active
                        ? palette.accentSoft
                        : palette.surface,

                    borderColor:
                      active
                        ? palette.accent
                        : palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.folderDot,
                    {
                      backgroundColor:
                        subject.color ??
                        palette.accent,
                    },
                  ]}
                />

                <Text
                  numberOfLines={
                    1
                  }
                  style={[
                    styles.mobileFolderText,
                    {
                      color:
                        active
                          ? palette.accentStrong
                          : palette.text,
                    },
                  ]}
                >
                  {
                    subject.name
                  }
                </Text>

                <Text
                  style={[
                    styles.mobileFolderCount,
                    {
                      color:
                        palette.textMuted,
                    },
                  ]}
                >
                  {
                    counts.total
                  }
                </Text>
              </Pressable>
            );
          },
        )}
      </ScrollView>
    );

  const renderOverview =
    () => (
      <View
        style={
          styles.overview
        }
      >
        {/* RITUAL */}

        <View
          style={[
            styles.ritual,

            compact &&
              styles.ritualCompact,

            {
              backgroundColor:
                palette.lavenderSoft,

              borderColor:
                palette.border,
            },
          ]}
        >
          <View
            style={
              styles.ritualHeading
            }
          >
            <MotionIcon
              backgroundColor={
                palette.surface
              }
              color={
                palette.accent
              }
              iconSize={
                compact
                  ? 17
                  : 20
              }
              loop
              name="ribbon-outline"
              size={
                compact
                  ? 38
                  : 44
              }
            />

            <View
              style={
                styles.ritualCopy
              }
            >
              <Text
                style={[
                  styles.ritualEyebrow,
                  {
                    color:
                      palette.accentStrong,
                  },
                ]}
              >
                YOUR STUDY SPACE
              </Text>

              <Text
                style={[
                  styles.ritualTitle,

                  compact &&
                    styles.ritualTitleCompact,

                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                Make space to focus
              </Text>
            </View>

            <Ionicons
              color={
                palette.lavender
              }
              name="sparkles-outline"
              size={
                18
              }
            />
          </View>

          <Text
            style={[
              styles.ritualDescription,

              compact &&
                styles.ritualDescriptionCompact,

              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            Open a material, capture a thought, or plan what comes next.
          </Text>

          <View
            style={[
              styles.actions,

              phone &&
                styles.actionsPhone,
            ]}
          >
            <AppButton
              icon="document-text-outline"
              label="New note"
              onPress={() =>
                router.push(
                  '/notes/create',
                )
              }
              style={
                styles.action
              }
              variant="secondary"
            />

            <AppButton
              icon="cloud-upload-outline"
              label="Add material"
              onPress={() =>
                router.push(
                  '/materials/create',
                )
              }
              style={
                styles.action
              }
              variant="secondary"
            />
          </View>
        </View>

        {/* YOUR FOLDERS */}

        <SectionTitle
          color={
            palette.text
          }
          title="Your folders"
        />

        <View
          style={
            styles.folderGrid
          }
        >
          {subjects.data?.map(
            (
              subject,
            ) => {
              const counts =
                getFolderCounts(
                  subject.id,
                );

              return (
                <Pressable
                  key={
                    subject.id
                  }
                  onPress={() =>
                    openFolder(
                      subject.id,
                    )
                  }
                  style={({ pressed }) => [
                    styles.folderCard,

                    splitLandscape &&
                      styles.folderCardLandscape,

                    compact &&
                      styles.folderCardCompact,

                    phone &&
                      styles.folderCardPhone,

                    {
                      backgroundColor:
                        palette.surface,

                      borderColor:
                        palette.border,

                      opacity:
                        pressed
                          ? 0.72
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.folderCardTop
                    }
                  >
                    <View
                      style={[
                        styles.folderIcon,
                        {
                          backgroundColor:
                            palette.accentSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        color={
                          subject.color ??
                          palette.accentStrong
                        }
                        name="folder-outline"
                        size={
                          compact
                            ? 19
                            : 22
                        }
                      />
                    </View>

                    <Ionicons
                      color={
                        palette.textMuted
                      }
                      name="chevron-forward"
                      size={
                        16
                      }
                    />
                  </View>

                  <Text
                    numberOfLines={
                      2
                    }
                    style={[
                      styles.folderCardTitle,

                      compact &&
                        styles.folderCardTitleCompact,

                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    {
                      subject.name
                    }
                  </Text>

                  <Text
                    style={[
                      styles.folderMeta,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    {counts.materialCount}{' '}
                    materials ·{' '}
                    {counts.noteCount}{' '}
                    notes
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>

        {!subjects.data?.length ? (
          <FeedbackState
            message="Create subjects first and each subject will get its own study folder."
            title="No folders yet"
          />
        ) : null}

        {/* CONTINUE */}

        <SectionTitle
          color={
            palette.text
          }
          title="Continue studying"
        />

        {continueMaterial ? (
          <EntityCard
            accent={
              bySubject.get(
                continueMaterial.subject_id,
              )?.color
            }
            badge={`${pdfReadingProgress(
              continueMaterial.last_read_page,
              continueMaterial.page_count ??
                0,
            )}%`}
            metadata={`Page ${
              continueMaterial.last_read_page
            } of ${
              continueMaterial.page_count ??
              '?'
            } · ${format(
              new Date(
                continueMaterial.last_opened_at!,
              ),
              'MMM d · h:mm a',
            )}`}
            onPress={() =>
              openMaterial(
                continueMaterial,
              )
            }
            subtitle={
              bySubject.get(
                continueMaterial.subject_id,
              )?.name
            }
            title={
              continueMaterial.title
            }
          />
        ) : (
          <FeedbackState
            message="Open a PDF and its reading progress will appear here."
            title="Nothing in progress"
          />
        )}

        {/* SESSIONS */}

        <SectionTitle
          color={
            palette.text
          }
          title="Next sessions"
        />

        <View
          style={
            styles.sessionGrid
          }
        >
          {plannedSessions.map(
            (
              item,
            ) => {
              const subject =
                bySubject.get(
                  item.subject_id,
                );

              return (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.sessionItem,

                    splitLandscape &&
                      styles.sessionItemLandscape,

                    phone &&
                      styles.sessionItemPhone,
                  ]}
                >
                  <EntityCard
                    accent={
                      subject?.color
                    }
                    badge={`${item.planned_duration} MIN`}
                    metadata={format(
                      new Date(
                        item.planned_at,
                      ),
                      'MMM d · h:mm a',
                    )}
                    onPress={() =>
                      router.push({
                        pathname:
                          '/sessions/[id]',

                        params: {
                          id:
                            item.id,
                        },
                      })
                    }
                    subtitle={
                      subject?.name
                    }
                    title={
                      item.topic
                    }
                  />
                </View>
              );
            },
          )}
        </View>

        {!plannedSessions.length ? (
          <FeedbackState
            message="Create a study plan from an upcoming exam."
            title="No sessions planned"
          />
        ) : null}
      </View>
    );

  const renderFolder =
    () => (
      <View
        style={
          styles.folderView
        }
      >
        {/* FOLDER HEADER */}

        <View
          style={[
            styles.folderHeader,

            compact &&
              styles.folderHeaderCompact,
          ]}
        >
          {!splitLandscape ? (
            <Pressable
              accessibilityLabel="Back to study overview"
              onPress={
                closeFolder
              }
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    palette.surface,

                  borderColor:
                    palette.border,
                },
              ]}
            >
              <Ionicons
                color={
                  palette.text
                }
                name="arrow-back"
                size={
                  18
                }
              />
            </Pressable>
          ) : null}

          <View
            style={[
              styles.bigFolderIcon,
              {
                backgroundColor:
                  palette.accentSoft,
              },
            ]}
          >
            <Ionicons
              color={
                selectedSubject
                  ?.color ??
                palette.accentStrong
              }
              name="folder-open-outline"
              size={
                compact
                  ? 22
                  : 26
              }
            />
          </View>

          <View
            style={
              styles.folderHeaderCopy
            }
          >
            <Text
              numberOfLines={
                2
              }
              style={[
                styles.folderTitle,

                compact &&
                  styles.folderTitleCompact,

                {
                  color:
                    palette.text,
                },
              ]}
            >
              {
                selectedSubject?.name ??
                'Subject'
              }
            </Text>

            <Text
              style={[
                styles.folderSubtitle,
                {
                  color:
                    palette.textMuted,
                },
              ]}
            >
              {folderMaterials.length}{' '}
              materials ·{' '}
              {folderNotes.length}{' '}
              notes
            </Text>
          </View>

          <Pressable
            onPress={() =>
              router.push(
                '/materials/create',
              )
            }
            style={[
              styles.addHeaderButton,
              {
                backgroundColor:
                  palette.accentSolid,
              },
            ]}
          >
            <Ionicons
              color="#FFFFFF"
              name="add"
              size={
                18
              }
            />

            {!phone ? (
              <Text
                style={
                  styles.addHeaderText
                }
              >
                Add
              </Text>
            ) : null}
          </Pressable>
        </View>

        {/* SEARCH */}

        <View
          style={[
            styles.searchBox,

            compact &&
              styles.searchBoxCompact,

            {
              backgroundColor:
                palette.surface,

              borderColor:
                palette.border,
            },
          ]}
        >
          <Ionicons
            color={
              palette.textMuted
            }
            name="search-outline"
            size={
              17
            }
          />

          <TextInput
            onChangeText={
              setSearch
            }
            placeholder="Search this folder"
            placeholderTextColor={
              palette.textMuted
            }
            selectionColor={
              palette.accent
            }
            style={[
              styles.searchInput,
              {
                color:
                  palette.text,
              },
            ]}
            value={
              search
            }
          />

          {search ? (
            <Pressable
              accessibilityLabel="Clear search"
              onPress={() =>
                setSearch('')
              }
            >
              <Ionicons
                color={
                  palette.textMuted
                }
                name="close-circle"
                size={
                  17
                }
              />
            </Pressable>
          ) : null}
        </View>

        {/* FILTERS */}

        <ScrollView
          contentContainerStyle={
            styles.filters
          }
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
        >
          {(
            [
              {
                label:
                  'All',
                value:
                  'ALL',
              },

              {
                label:
                  'Materials',
                value:
                  'MATERIALS',
              },

              {
                label:
                  'Notes',
                value:
                  'NOTES',
              },
            ] as {
              label:
                string;

              value:
                LibraryFilter;
            }[]
          ).map(
            (
              option,
            ) => {
              const active =
                filter ===
                option.value;

              return (
                <Pressable
                  key={
                    option.value
                  }
                  onPress={() =>
                    setFilter(
                      option.value,
                    )
                  }
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor:
                        active
                          ? palette.accentSoft
                          : palette.surface,

                      borderColor:
                        active
                          ? palette.accent
                          : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          active
                            ? palette.accentStrong
                            : palette.textMuted,
                      },
                    ]}
                  >
                    {
                      option.label
                    }
                  </Text>
                </Pressable>
              );
            },
          )}
        </ScrollView>

        {/* FILE GRID */}

        {resultCount ? (
          <View
            style={
              styles.fileGrid
            }
          >
            {filteredMaterials.map(
              (
                item,
              ) => {
                const progress =
                  item.type ===
                    'PDF' &&
                  item.page_count
                    ? pdfReadingProgress(
                        item.last_read_page,
                        item.page_count,
                      )
                    : null;

                return (
                  <View
                    key={
                      item.id
                    }
                    style={[
                      styles.fileTile,

                      splitLandscape &&
                        styles.fileTileLandscape,

                      compact &&
                        styles.fileTileCompact,

                      phone &&
                        styles.fileTilePhone,

                      {
                        backgroundColor:
                          palette.surface,

                        borderColor:
                          palette.border,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() =>
                        openMaterial(
                          item,
                        )
                      }
                      style={
                        styles.fileMain
                      }
                    >
                      <View
                        style={[
                          styles.filePreview,

                          compact &&
                            styles.filePreviewCompact,

                          {
                            backgroundColor:
                              item.type ===
                              'PDF'
                                ? palette.accentSoft
                                : palette.lavenderSoft,
                          },
                        ]}
                      >
                        <Ionicons
                          color={
                            item.type ===
                            'PDF'
                              ? palette.accentStrong
                              : palette.lavender
                          }
                          name={
                            item.type ===
                            'PDF'
                              ? 'document-text-outline'
                              : 'link-outline'
                          }
                          size={
                            compact
                              ? 25
                              : 30
                          }
                        />

                        {progress !==
                        null ? (
                          <View
                            style={[
                              styles.progressBadge,
                              {
                                backgroundColor:
                                  palette.surface,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.progressBadgeText,
                                {
                                  color:
                                    palette.accentStrong,
                                },
                              ]}
                            >
                              {
                                progress
                              }%
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.fileCopy
                        }
                      >
                        <Text
                          numberOfLines={
                            2
                          }
                          style={[
                            styles.fileTitle,
                            {
                              color:
                                palette.text,
                            },
                          ]}
                        >
                          {
                            item.title
                          }
                        </Text>

                        <Text
                          numberOfLines={
                            1
                          }
                          style={[
                            styles.fileMeta,
                            {
                              color:
                                palette.textMuted,
                            },
                          ]}
                        >
                          {item.type ===
                          'PDF'
                            ? item.page_count
                              ? `${item.page_count} pages`
                              : 'PDF'
                            : item.type}
                        </Text>
                      </View>
                    </Pressable>

                    <Pressable
                      accessibilityLabel={`Delete ${item.title}`}
                      disabled={
                        removeMaterial.isPending
                      }
                      onPress={() =>
                        confirmDeleteMaterial(
                          item,
                        )
                      }
                      style={
                        styles.tileDelete
                      }
                    >
                      <Ionicons
                        color={
                          palette.danger
                        }
                        name="trash-outline"
                        size={
                          15
                        }
                      />
                    </Pressable>
                  </View>
                );
              },
            )}

            {filteredNotes.map(
              (
                item,
              ) => (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.fileTile,

                    splitLandscape &&
                      styles.fileTileLandscape,

                    compact &&
                      styles.fileTileCompact,

                    phone &&
                      styles.fileTilePhone,

                    {
                      backgroundColor:
                        palette.surface,

                      borderColor:
                        palette.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      openNote(
                        item,
                      )
                    }
                    style={
                      styles.fileMain
                    }
                  >
                    <View
                      style={[
                        styles.filePreview,

                        compact &&
                          styles.filePreviewCompact,

                        {
                          backgroundColor:
                            palette.lavenderSoft,
                        },
                      ]}
                    >
                      <Ionicons
                        color={
                          palette.lavender
                        }
                        name="create-outline"
                        size={
                          compact
                            ? 25
                            : 30
                        }
                      />

                      {item.page_number ? (
                        <View
                          style={[
                            styles.progressBadge,
                            {
                              backgroundColor:
                                palette.surface,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.progressBadgeText,
                              {
                                color:
                                  palette.accentStrong,
                              },
                            ]}
                          >
                            P.
                            {
                              item.page_number
                            }
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View
                      style={
                        styles.fileCopy
                      }
                    >
                      <Text
                        numberOfLines={
                          2
                        }
                        style={[
                          styles.fileTitle,
                          {
                            color:
                              palette.text,
                          },
                        ]}
                      >
                        {item.title ??
                          `Page ${
                            item.page_number ??
                            '—'
                          } note`}
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.fileMeta,
                          {
                            color:
                              palette.textMuted,
                          },
                        ]}
                      >
                        Note ·{' '}
                        {format(
                          new Date(
                            item.updated_at,
                          ),
                          'MMM d',
                        )}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Delete note"
                    disabled={
                      removeNote.isPending
                    }
                    onPress={() =>
                      confirmDeleteNote(
                        item,
                      )
                    }
                    style={
                      styles.tileDelete
                    }
                  >
                    <Ionicons
                      color={
                        palette.danger
                      }
                      name="trash-outline"
                      size={
                        15
                      }
                    />
                  </Pressable>
                </View>
              ),
            )}

            {/* CREATE TILE */}

            <Pressable
              onPress={() =>
                router.push(
                  '/materials/create',
                )
              }
              style={({ pressed }) => [
                styles.createTile,

                splitLandscape &&
                  styles.fileTileLandscape,

                compact &&
                  styles.fileTileCompact,

                phone &&
                  styles.fileTilePhone,

                {
                  backgroundColor:
                    palette.surfaceAlt,

                  borderColor:
                    palette.border,

                  opacity:
                    pressed
                      ? 0.7
                      : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.createIcon,
                  {
                    backgroundColor:
                      palette.accentSoft,
                  },
                ]}
              >
                <Ionicons
                  color={
                    palette.accentStrong
                  }
                  name="add"
                  size={
                    22
                  }
                />
              </View>

              <Text
                style={[
                  styles.createTitle,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                Add material
              </Text>

              <Text
                style={[
                  styles.createCaption,
                  {
                    color:
                      palette.textMuted,
                  },
                ]}
              >
                PDF or study resource
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.emptyFolder,

              compact &&
                styles.emptyFolderCompact,

              {
                backgroundColor:
                  palette.surface,

                borderColor:
                  palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyFolderIcon,

                compact &&
                  styles.emptyFolderIconCompact,

                {
                  backgroundColor:
                    palette.accentSoft,
                },
              ]}
            >
              <Ionicons
                color={
                  palette.text
                }
                name="folder-outline"
                size={
                  compact
                    ? 20
                    : 23
                }
              />
            </View>

            <Text
              style={[
                styles.emptyFolderTitle,

                compact &&
                  styles.emptyFolderTitleCompact,

                {
                  color:
                    palette.text,
                },
              ]}
            >
              {normalizedSearch
                ? 'No matching files'
                : 'This folder is empty'}
            </Text>

            <Text
              style={[
                styles.emptyFolderDescription,

                compact &&
                  styles.emptyFolderDescriptionCompact,

                {
                  color:
                    palette.textMuted,
                },
              ]}
            >
              {normalizedSearch
                ? 'Try another search or filter.'
                : 'Add a PDF, material or note to this folder.'}
            </Text>

            {!normalizedSearch ? (
              <Pressable
                onPress={() =>
                  router.push(
                    '/materials/create',
                  )
                }
                style={[
                  styles.emptyAdd,

                  compact &&
                    styles.emptyAddCompact,

                  {
                    backgroundColor:
                      palette.accentSoft,
                  },
                ]}
              >
                <Ionicons
                  color={
                    palette.accentStrong
                  }
                  name="add"
                  size={
                    14
                  }
                />

                <Text
                  style={[
                    styles.emptyAddText,
                    {
                      color:
                        palette.accentStrong,
                    },
                  ]}
                >
                  Add material
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    );

  return (
    <EntityList
      addLabel="Add material"
      description="Your materials, notes and study sessions in one place."
      empty={
        false
      }
      emptyMessage=""
      error={
        materials.error ??
        notes.error ??
        sessions.error ??
        subjects.error
      }
      loading={
        loading
      }
      onAdd={() =>
        router.push(
          '/materials/create',
        )
      }
      onRefresh={() =>
        void Promise.all([
          materials.refetch(),
          notes.refetch(),
          sessions.refetch(),
          subjects.refetch(),
        ])
      }
      refreshing={
        materials.isRefetching ||
        notes.isRefetching ||
        sessions.isRefetching ||
        subjects.isRefetching
      }
      title="Study"
    >
      {!splitLandscape
        ? renderMobileFolders()
        : null}

      <View
        style={[
          styles.shell,

          splitLandscape &&
            styles.shellLandscape,
        ]}
      >
        {splitLandscape
          ? renderSidebar()
          : null}

        <View
          style={
            styles.main
          }
        >
          {selectedSubjectId
            ? renderFolder()
            : renderOverview()}
        </View>
      </View>
    </EntityList>
  );
}

function SectionTitle({
  color,
  title,
}: {
  color:
    string;
  title:
    string;
}) {
  return (
    <View
      style={
        styles.sectionHeading
      }
    >
      <Text
        style={[
          styles.section,
          {
            color,
          },
        ]}
      >
        {title}
      </Text>

      <View
        style={[
          styles.sectionRule,
          {
            backgroundColor:
              color,
          },
        ]}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    shell: {
      width:
        '100%',
    },

    shellLandscape: {
      alignItems:
        'flex-start',
      flexDirection:
        'row',
      gap:
        18,
    },

    main: {
      flex:
        1,
      minWidth:
        0,
    },

    /*
     * LANDSCAPE SIDEBAR
     */

    sidebar: {
      borderRadius:
        20,
      borderWidth:
        1,
      maxHeight:
        680,
      minWidth:
        220,
      overflow:
        'hidden',
      width:
        230,
    },

    sidebarHeader: {
      alignItems:
        'center',
      flexDirection:
        'row',
      gap:
        9,
      padding:
        14,
    },

    sidebarIcon: {
      alignItems:
        'center',
      borderRadius:
        11,
      height:
        35,
      justifyContent:
        'center',
      width:
        35,
    },

    sidebarHeaderCopy: {
      flex:
        1,
      gap:
        1,
    },

    sidebarTitle: {
      ...typography.sectionTitle,
      fontSize:
        15,
      lineHeight:
        19,
    },

    sidebarCaption: {
      ...typography.caption,
      fontSize:
        9,
    },

    sidebarFolders: {
      gap:
        3,
      paddingHorizontal:
        8,
      paddingBottom:
        10,
    },

    sidebarRow: {
      alignItems:
        'center',
      borderRadius:
        12,
      flexDirection:
        'row',
      gap:
        8,
      minHeight:
        40,
      paddingHorizontal:
        10,
    },

    sidebarRowText: {
      ...typography.body,
      flex:
        1,
      fontSize:
        11,
      fontWeight:
        '700',
    },

    sidebarCount: {
      ...typography.caption,
      fontSize:
        8,
      fontWeight:
        '700',
    },

    folderDot: {
      borderRadius:
        radii.pill,
      height:
        8,
      width:
        8,
    },

    manageFolders: {
      alignItems:
        'center',
      borderTopWidth:
        1,
      flexDirection:
        'row',
      gap:
        7,
      minHeight:
        44,
      paddingHorizontal:
        14,
    },

    manageFoldersText: {
      ...typography.caption,
      fontSize:
        9,
      fontWeight:
        '700',
    },

    /*
     * PORTRAIT FOLDERS
     */

    mobileFolders: {
      gap:
        7,
      paddingBottom:
        10,
    },

    mobileFolderChip: {
      alignItems:
        'center',
      borderRadius:
        radii.pill,
      borderWidth:
        1,
      flexDirection:
        'row',
      gap:
        7,
      height:
        39,
      maxWidth:
        190,
      paddingHorizontal:
        12,
    },

    mobileFolderChipCompact: {
      gap:
        5,
      height:
        34,
      maxWidth:
        155,
      paddingHorizontal:
        9,
    },

    mobileFolderText: {
      ...typography.caption,
      flexShrink:
        1,
      fontSize:
        10,
      fontWeight:
        '700',
    },

    mobileFolderCount: {
      ...typography.caption,
      fontSize:
        8,
      fontWeight:
        '700',
    },

    /*
     * OVERVIEW
     */

    overview: {
      gap:
        12,
      width:
        '100%',
    },

    ritual: {
      borderRadius:
        radii.xl,
      borderWidth:
        1,
      gap:
        spacing.md,
      overflow:
        'hidden',
      padding:
        spacing.lg,
    },

    ritualCompact: {
      borderRadius:
        16,
      gap:
        9,
      padding:
        13,
    },

    ritualHeading: {
      alignItems:
        'center',
      flexDirection:
        'row',
      gap:
        spacing.md,
    },

    ritualCopy: {
      flex:
        1,
      gap:
        2,
    },

    ritualEyebrow: {
      ...typography.label,
      fontSize:
        8,
    },

    ritualTitle: {
      ...typography.sectionTitle,
      fontSize:
        21,
      lineHeight:
        27,
    },

    ritualTitleCompact: {
      fontSize:
        17,
      lineHeight:
        21,
    },

    ritualDescription: {
      ...typography.body,
      fontSize:
        13,
      lineHeight:
        19,
    },

    ritualDescriptionCompact: {
      fontSize:
        11,
      lineHeight:
        16,
    },

    actions: {
      flexDirection:
        'row',
      gap:
        spacing.sm,
    },

    actionsPhone: {
      flexDirection:
        'column',
    },

    action: {
      flex:
        1,
    },

    sectionHeading: {
      alignItems:
        'center',
      flexDirection:
        'row',
      gap:
        spacing.sm,
      marginTop:
        7,
    },

    section: {
      ...typography.sectionTitle,
      fontSize:
        17,
      lineHeight:
        22,
    },

    sectionRule: {
      flex:
        1,
      height:
        1,
      marginLeft:
        3,
      opacity:
        0.13,
    },

    folderGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap:
        10,
    },

    folderCard: {
      borderRadius:
        17,
      borderWidth:
        1,
      gap:
        8,
      minHeight:
        108,
      padding:
        13,
      width:
        '48.5%',
    },

    folderCardLandscape: {
      minHeight:
        105,
      width:
        '31.5%',
    },

    folderCardCompact: {
      borderRadius:
        13,
      gap:
        7,
      minHeight:
        82,
      padding:
        10,
      width:
        '48%',
    },

    folderCardPhone: {
      width:
        '100%',
    },

    folderCardTop: {
      alignItems:
        'center',
      flexDirection:
        'row',
      justifyContent:
        'space-between',
    },

    folderIcon: {
      alignItems:
        'center',
      borderRadius:
        11,
      height:
        37,
      justifyContent:
        'center',
      width:
        37,
    },

    folderCardTitle: {
      ...typography.sectionTitle,
      fontSize:
        15,
      lineHeight:
        20,
    },

    folderCardTitleCompact: {
      fontSize:
        13,
      lineHeight:
        17,
    },

    folderMeta: {
      ...typography.caption,
      fontSize:
        8,
      lineHeight:
        12,
    },

    sessionGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap:
        10,
    },

    sessionItem: {
      width:
        '100%',
    },

    sessionItemLandscape: {
      width:
        '48.5%',
    },

    sessionItemPhone: {
      width:
        '100%',
    },

    /*
     * FOLDER VIEW
     */

    folderView: {
      gap:
        12,
      width:
        '100%',
    },

    folderHeader: {
      alignItems:
        'center',
      flexDirection:
        'row',
      gap:
        11,
      paddingVertical:
        4,
    },

    folderHeaderCompact: {
      gap:
        8,
    },

    backButton: {
      alignItems:
        'center',
      borderRadius:
        radii.pill,
      borderWidth:
        1,
      height:
        38,
      justifyContent:
        'center',
      width:
        38,
    },

    bigFolderIcon: {
      alignItems:
        'center',
      borderRadius:
        14,
      height:
        48,
      justifyContent:
        'center',
      width:
        48,
    },

    folderHeaderCopy: {
      flex:
        1,
      gap:
        2,
      minWidth:
        0,
    },

    folderTitle: {
      ...typography.sectionTitle,
      fontSize:
        22,
      lineHeight:
        28,
    },

    folderTitleCompact: {
      fontSize:
        18,
      lineHeight:
        23,
    },

    folderSubtitle: {
      ...typography.caption,
      fontSize:
        9,
    },

    addHeaderButton: {
      alignItems:
        'center',
      borderRadius:
        radii.pill,
      flexDirection:
        'row',
      gap:
        5,
      minHeight:
        38,
      paddingHorizontal:
        13,
    },

    addHeaderText: {
      ...typography.caption,
      color:
        '#FFFFFF',
      fontSize:
        9,
      fontWeight:
        '800',
    },

    searchBox: {
      alignItems:
        'center',
      borderRadius:
        14,
      borderWidth:
        1,
      flexDirection:
        'row',
      gap:
        8,
      minHeight:
        43,
      paddingHorizontal:
        12,
    },

    searchBoxCompact: {
      borderRadius:
        11,
      gap:
        7,
      minHeight:
        38,
      paddingHorizontal:
        10,
    },

    searchInput: {
      ...typography.body,
      flex:
        1,
      fontSize:
        12,
      lineHeight:
        18,
      minWidth:
        0,
      paddingVertical:
        8,
    },

    filters: {
      gap:
        7,
    },

    filterButton: {
      borderRadius:
        radii.pill,
      borderWidth:
        1,
      minHeight:
        32,
      justifyContent:
        'center',
      paddingHorizontal:
        11,
    },

    filterText: {
      ...typography.caption,
      fontSize:
        9,
      fontWeight:
        '800',
    },

    /*
     * FILE GRID
     */

    fileGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap:
        10,
      width:
        '100%',
    },

    fileTile: {
      borderRadius:
        16,
      borderWidth:
        1,
      overflow:
        'hidden',
      position:
        'relative',
      width:
        '48.5%',
    },

    fileTileLandscape: {
      width:
        '31.5%',
    },

    fileTileCompact: {
      borderRadius:
        12,
      width:
        '48%',
    },

    fileTilePhone: {
      width:
        '100%',
    },

    fileMain: {
      width:
        '100%',
    },

    filePreview: {
      alignItems:
        'center',
      height:
        105,
      justifyContent:
        'center',
      position:
        'relative',
    },

    filePreviewCompact: {
      height:
        82,
    },

    progressBadge: {
      borderRadius:
        radii.pill,
      bottom:
        8,
      paddingHorizontal:
        7,
      paddingVertical:
        3,
      position:
        'absolute',
      right:
        8,
    },

    progressBadgeText: {
      ...typography.label,
      fontSize:
        7,
    },

    fileCopy: {
      gap:
        3,
      padding:
        10,
      paddingRight:
        37,
    },

    fileTitle: {
      ...typography.body,
      fontSize:
        11,
      fontWeight:
        '700',
      lineHeight:
        15,
    },

    fileMeta: {
      ...typography.caption,
      fontSize:
        8,
      lineHeight:
        11,
    },

    tileDelete: {
      alignItems:
        'center',
      bottom:
        8,
      height:
        28,
      justifyContent:
        'center',
      position:
        'absolute',
      right:
        7,
      width:
        28,
    },

    createTile: {
      alignItems:
        'center',
      borderRadius:
        16,
      borderStyle:
        'dashed',
      borderWidth:
        1,
      gap:
        5,
      justifyContent:
        'center',
      minHeight:
        160,
      padding:
        14,
      width:
        '48.5%',
    },

    createIcon: {
      alignItems:
        'center',
      borderRadius:
        radii.pill,
      height:
        40,
      justifyContent:
        'center',
      width:
        40,
    },

    createTitle: {
      ...typography.body,
      fontSize:
        11,
      fontWeight:
        '700',
    },

    createCaption: {
      ...typography.caption,
      fontSize:
        8,
      textAlign:
        'center',
    },

    /*
     * EMPTY FOLDER
     */

    emptyFolder: {
      alignItems:
        'center',
      borderRadius:
        22,
      borderWidth:
        1,
      gap:
        7,
      justifyContent:
        'center',
      minHeight:
        160,
      paddingHorizontal:
        22,
      paddingVertical:
        20,
      width:
        '100%',
    },

    emptyFolderCompact: {
      borderRadius:
        16,
      gap:
        4,
      minHeight:
        112,
      paddingHorizontal:
        14,
      paddingVertical:
        13,
    },

    emptyFolderIcon: {
      alignItems:
        'center',
      borderRadius:
        radii.pill,
      height:
        50,
      justifyContent:
        'center',
      marginBottom:
        1,
      width:
        50,
    },

    emptyFolderIconCompact: {
      height:
        40,
      width:
        40,
    },

    emptyFolderTitle: {
      ...typography.sectionTitle,
      fontSize:
        17,
      lineHeight:
        22,
      textAlign:
        'center',
    },

    emptyFolderTitleCompact: {
      fontSize:
        14,
      lineHeight:
        18,
    },

    emptyFolderDescription: {
      ...typography.body,
      fontSize:
        13,
      lineHeight:
        18,
      textAlign:
        'center',
    },

    emptyFolderDescriptionCompact: {
      fontSize:
        11,
      lineHeight:
        15,
    },

    emptyAdd: {
      alignItems:
        'center',
      borderRadius:
        radii.pill,
      flexDirection:
        'row',
      gap:
        4,
      marginTop:
        4,
      minHeight:
        32,
      paddingHorizontal:
        10,
    },

    emptyAddCompact: {
      marginTop:
        2,
      minHeight:
        28,
      paddingHorizontal:
        8,
    },

    emptyAddText: {
      ...typography.caption,
      fontSize:
        9,
      fontWeight:
        '700',
    },
  });
