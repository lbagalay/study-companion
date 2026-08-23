import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';

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

import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { pdfReadingProgress } from '@/lib/pdf/progress';

import {
  deleteMaterial as deleteMaterialService,
  deleteRecord,
} from '@/services';

type LibraryFilter =
  | 'ALL'
  | 'MATERIALS'
  | 'NOTES';

export default function StudyScreen() {
  const router = useRouter();
  const palette = useAppTheme();
  const { width } = useWindowDimensions();

  const desktop = width >= 860;

  const materials = useMaterials();
  const notes = useNotes();
  const sessions = useSessions();
  const subjects = useSubjects();

  const [folderOpen, setFolderOpen] =
    useState(false);

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState<string | null>(null);

  const [filter, setFilter] =
    useState<LibraryFilter>('ALL');

  const [search, setSearch] =
    useState('');

  const bySubject = useMemo(
    () =>
      new Map(
        subjects.data?.map(
          (subject) => [
            subject.id,
            subject,
          ],
        ) ?? [],
      ),
    [subjects.data],
  );

  const loading =
    materials.isLoading ||
    notes.isLoading ||
    sessions.isLoading ||
    subjects.isLoading;

  const selectedSubject =
    selectedSubjectId
      ? bySubject.get(selectedSubjectId)
      : null;

  const selectedFolderName =
    selectedSubject?.name ?? 'All Files';

  const continueMaterial =
    materials.data
      ?.filter(
        (item) =>
          item.type === 'PDF' &&
          item.file_url &&
          item.last_opened_at &&
          !item.completed,
      )
      .sort(
        (a, b) =>
          new Date(
            b.last_opened_at!,
          ).getTime() -
          new Date(
            a.last_opened_at!,
          ).getTime(),
      )[0];

  const subjectMaterials = useMemo(() => {
    const all = materials.data ?? [];

    if (!selectedSubjectId) {
      return all;
    }

    return all.filter(
      (item) =>
        item.subject_id ===
        selectedSubjectId,
    );
  }, [
    materials.data,
    selectedSubjectId,
  ]);

  const subjectNotes = useMemo(() => {
    const all = notes.data ?? [];

    if (!selectedSubjectId) {
      return all;
    }

    return all.filter(
      (item) =>
        item.subject_id ===
        selectedSubjectId,
    );
  }, [
    notes.data,
    selectedSubjectId,
  ]);

  const query = search
    .trim()
    .toLowerCase();

  const visibleMaterials = useMemo(() => {
    if (!query) {
      return subjectMaterials;
    }

    return subjectMaterials.filter(
      (item) => {
        const subject =
          bySubject.get(
            item.subject_id,
          );

        return [
          item.title,
          item.file_name,
          subject?.name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query),
          );
      },
    );
  }, [
    bySubject,
    query,
    subjectMaterials,
  ]);

  const visibleNotes = useMemo(() => {
    if (!query) {
      return subjectNotes;
    }

    return subjectNotes.filter(
      (item) => {
        const subject =
          bySubject.get(
            item.subject_id,
          );

        return [
          item.title,
          subject?.name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query),
          );
      },
    );
  }, [
    bySubject,
    query,
    subjectNotes,
  ]);

  const gridItems = useMemo(() => {
    const materialEntries =
      filter === 'ALL' ||
      filter === 'MATERIALS'
        ? visibleMaterials.map(
            (item) => ({
              kind: 'MATERIAL' as const,
              date: item.created_at,
              item,
            }),
          )
        : [];

    const noteEntries =
      filter === 'ALL' ||
      filter === 'NOTES'
        ? visibleNotes.map(
            (item) => ({
              kind: 'NOTE' as const,
              date: item.updated_at,
              item,
            }),
          )
        : [];

    return [
      ...materialEntries,
      ...noteEntries,
    ].sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime(),
    );
  }, [
    filter,
    visibleMaterials,
    visibleNotes,
  ]);

  const openFolder = (
    subjectId: string | null,
  ) => {
    setSelectedSubjectId(subjectId);
    setFilter('ALL');
    setSearch('');
    setFolderOpen(true);
  };

  const closeFolder = () => {
    setFolderOpen(false);
    setSelectedSubjectId(null);
    setFilter('ALL');
    setSearch('');
  };

  const removeMaterial = useMutation({
    mutationFn: ({
      id,
      path,
    }: {
      id: string;
      path?: string | null;
    }) =>
      deleteMaterialService(id, path),

    onSuccess: async () => {
      await Promise.all([
        materials.refetch(),
        notes.refetch(),
      ]);
    },

    onError: (error) => {
      const message =
        getErrorMessage(error);

      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined'
      ) {
        window.alert(
          `Could not delete material\n\n${message}`,
        );
        return;
      }

      Alert.alert(
        'Could not delete material',
        message,
      );
    },
  });

  const removeNote = useMutation({
    mutationFn: (id: string) =>
      deleteRecord('notes', id),

    onSuccess: async () => {
      await notes.refetch();
    },

    onError: (error) => {
      const message =
        getErrorMessage(error);

      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined'
      ) {
        window.alert(
          `Could not delete note\n\n${message}`,
        );
        return;
      }

      Alert.alert(
        'Could not delete note',
        message,
      );
    },
  });

  const openMaterial = (
    item: NonNullable<
      typeof materials.data
    >[number],
  ) => {
    if (
      item.type === 'PDF' &&
      item.file_url
    ) {
      router.push(
        `/materials/${item.id}/reader` as never,
      );
      return;
    }

    router.push({
      pathname: '/materials/[id]',
      params: {
        id: item.id,
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
      item.page_number != null
    ) {
      router.push({
        pathname:
          '/materials/[id]/reader',
        params: {
          id: item.material_id,
          page: String(
            item.page_number,
          ),
        },
      });

      return;
    }

    router.push({
      pathname: '/notes/[id]',
      params: {
        id: item.id,
      },
    });
  };

  const confirmDeleteMaterial = (
    item: NonNullable<
      typeof materials.data
    >[number],
  ) => {
    const perform = () => {
      removeMaterial.mutate({
        id: item.id,
        path: item.file_url,
      });
    };

    const message =
      `Delete "${item.title}"? ` +
      'This cannot be undone.';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      if (window.confirm(message)) {
        perform();
      }

      return;
    }

    Alert.alert(
      'Delete material?',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: perform,
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
      item.title ?? 'Untitled note';

    const perform = () => {
      removeNote.mutate(item.id);
    };

    const message =
      `Delete "${title}"? ` +
      'This cannot be undone.';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      if (window.confirm(message)) {
        perform();
      }

      return;
    }

    Alert.alert(
      'Delete note?',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: perform,
        },
      ],
    );
  };

  const totalCount =
    (materials.data?.length ?? 0) +
    (notes.data?.length ?? 0);

  const activeSessions =
    sessions.data?.filter(
      (session) =>
        session.status === 'PLANNED' ||
        session.status === 'IN_PROGRESS',
    ) ?? [];

  return (
    <EntityList
      description="Your notes, PDFs, materials and study files."
      empty={false}
      emptyMessage=""
      error={
        materials.error ??
        notes.error ??
        sessions.error ??
        subjects.error
      }
      loading={loading}
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
      <View
        style={[
          styles.workspace,
          !desktop &&
            styles.workspaceMobile,
        ]}
      >
        {/* SIDEBAR */}
        <View
          style={[
            styles.sidebar,
            {
              backgroundColor:
                palette.surface,
              borderColor:
                palette.border,
            },
            !desktop &&
              styles.sidebarMobile,
          ]}
        >
          <View
            style={
              styles.sidebarHeading
            }
          >
            <View>
              <Text
                style={[
                  styles.sidebarEyebrow,
                  {
                    color:
                      palette.textMuted,
                  },
                ]}
              >
                STUDY LIBRARY
              </Text>

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
            </View>

            <Pressable
              accessibilityLabel="Add material"
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  '/materials/create',
                )
              }
              style={[
                styles.addButton,
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
                size={20}
              />
            </Pressable>
          </View>

          <View
            style={[
              styles.folderList,
              !desktop &&
                styles.folderListMobile,
            ]}
          >
            <FolderRow
              accent={palette.accent}
              active={
                folderOpen &&
                selectedSubjectId ===
                  null
              }
              compact={!desktop}
              count={totalCount}
              label="All Files"
              onPress={() =>
                openFolder(null)
              }
            />

            {subjects.data?.map(
              (subject) => {
                const materialCount =
                  materials.data?.filter(
                    (item) =>
                      item.subject_id ===
                      subject.id,
                  ).length ?? 0;

                const noteCount =
                  notes.data?.filter(
                    (item) =>
                      item.subject_id ===
                      subject.id,
                  ).length ?? 0;

                return (
                  <FolderRow
                    accent={
                      subject.color ??
                      palette.accent
                    }
                    active={
                      folderOpen &&
                      selectedSubjectId ===
                        subject.id
                    }
                    compact={!desktop}
                    count={
                      materialCount +
                      noteCount
                    }
                    key={subject.id}
                    label={
                      subject.name
                    }
                    onPress={() =>
                      openFolder(
                        subject.id,
                      )
                    }
                  />
                );
              },
            )}
          </View>

          {desktop ? (
            <View
              style={[
                styles.sidebarTools,
                {
                  borderTopColor:
                    palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.sidebarEyebrow,
                  {
                    color:
                      palette.textMuted,
                  },
                ]}
              >
                STUDY TOOLS
              </Text>

              <SidebarAction
                icon="create-outline"
                label="New note"
                onPress={() =>
                  router.push(
                    '/notes/create',
                  )
                }
              />

              <SidebarAction
                icon="sparkles-outline"
                label="Plan study"
                onPress={() =>
                  router.push(
                    '/sessions/create-plan',
                  )
                }
              />

              <SidebarAction
                icon="calendar-outline"
                label="Sessions"
                onPress={() =>
                  router.push(
                    '/sessions',
                  )
                }
              />
            </View>
          ) : null}
        </View>

        {/* MAIN */}
        <View style={styles.main}>
          {folderOpen ? (
            <>
              {/* FOLDER HEADER */}
              <View
                style={
                  styles.mainHeader
                }
              >
                <View
                  style={
                    styles.headerLeft
                  }
                >
                  <Pressable
                    accessibilityLabel="Back to folders"
                    accessibilityRole="button"
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
                        palette.accentStrong
                      }
                      name="arrow-back"
                      size={21}
                    />
                  </Pressable>

                  <View
                    style={
                      styles.mainTitleGroup
                    }
                  >
                    <Text
                      style={[
                        styles.mainEyebrow,
                        {
                          color:
                            palette.textMuted,
                        },
                      ]}
                    >
                      OPEN FOLDER
                    </Text>

                    <Text
                      style={[
                        styles.mainTitle,
                        {
                          color:
                            palette.text,
                        },
                      ]}
                    >
                      {
                        selectedFolderName
                      }
                    </Text>

                    <Text
                      style={[
                        styles.mainSubtitle,
                        {
                          color:
                            palette.textMuted,
                        },
                      ]}
                    >
                      {subjectMaterials.length +
                        subjectNotes.length}{' '}
                      items
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.topActions
                  }
                >
                  <Pressable
                    accessibilityLabel="New note"
                    accessibilityRole="button"
                    onPress={() =>
                      router.push(
                        '/notes/create',
                      )
                    }
                    style={[
                      styles.roundAction,
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
                        palette.accentStrong
                      }
                      name="create-outline"
                      size={20}
                    />
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Add material"
                    accessibilityRole="button"
                    onPress={() =>
                      router.push(
                        '/materials/create',
                      )
                    }
                    style={[
                      styles.roundAction,
                      {
                        backgroundColor:
                          palette.accentSoft,
                        borderColor:
                          palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      color={
                        palette.accentStrong
                      }
                      name="add"
                      size={23}
                    />
                  </Pressable>
                </View>
              </View>

              {/* SEARCH */}
              <View
                style={[
                  styles.searchBox,
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
                  size={20}
                />

                <TextInput
                  onChangeText={
                    setSearch
                  }
                  placeholder={`Search ${selectedFolderName}`}
                  placeholderTextColor={
                    palette.textMuted
                  }
                  style={[
                    styles.searchInput,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                  value={search}
                />

                {search ? (
                  <Pressable
                    accessibilityLabel="Clear search"
                    accessibilityRole="button"
                    onPress={() =>
                      setSearch('')
                    }
                  >
                    <Ionicons
                      color={
                        palette.textMuted
                      }
                      name="close-circle"
                      size={19}
                    />
                  </Pressable>
                ) : null}
              </View>

              {/* FILTERS */}
              <View
                style={[
                  styles.filters,
                  {
                    backgroundColor:
                      palette.surfaceAlt,
                  },
                ]}
              >
                <FilterTab
                  active={
                    filter === 'ALL'
                  }
                  label="All"
                  onPress={() =>
                    setFilter('ALL')
                  }
                />

                <FilterTab
                  active={
                    filter ===
                    'MATERIALS'
                  }
                  label="Materials"
                  onPress={() =>
                    setFilter(
                      'MATERIALS',
                    )
                  }
                />

                <FilterTab
                  active={
                    filter === 'NOTES'
                  }
                  label="Notes"
                  onPress={() =>
                    setFilter('NOTES')
                  }
                />
              </View>

              {/* FILE GRID */}
              <View
                style={
                  styles.fileGrid
                }
              >
                <CreateTile
                  desktop={desktop}
                  onPress={() =>
                    router.push(
                      '/materials/create',
                    )
                  }
                />

                {gridItems.map(
                  (entry) => {
                    if (
                      entry.kind ===
                      'MATERIAL'
                    ) {
                      const item =
                        entry.item;

                      const subject =
                        bySubject.get(
                          item.subject_id,
                        );

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
                        <FileTile
                          accent={
                            subject?.color ??
                            palette.accent
                          }
                          badge={
                            item.favorite
                              ? 'FAVORITE'
                              : progress !==
                                  null
                                ? `${progress}%`
                                : item.type
                          }
                          date={format(
                            new Date(
                              item.created_at,
                            ),
                            'MMM d · h:mm a',
                          )}
                          deleteDisabled={
                            removeMaterial.isPending
                          }
                          desktop={
                            desktop
                          }
                          key={`material-${item.id}`}
                          kind={
                            item.type ===
                            'PDF'
                              ? 'PDF'
                              : 'MATERIAL'
                          }
                          onDelete={() =>
                            confirmDeleteMaterial(
                              item,
                            )
                          }
                          onPress={() =>
                            openMaterial(
                              item,
                            )
                          }
                          subtitle={
                            subject?.name
                          }
                          title={
                            item.title
                          }
                        />
                      );
                    }

                    const item =
                      entry.item;

                    const subject =
                      bySubject.get(
                        item.subject_id,
                      );

                    return (
                      <FileTile
                        accent={
                          subject?.color ??
                          palette.lavender
                        }
                        badge={
                          item.favorite
                            ? 'FAVORITE'
                            : item.page_number
                              ? `PAGE ${item.page_number}`
                              : 'NOTE'
                        }
                        date={format(
                          new Date(
                            item.updated_at,
                          ),
                          'MMM d · h:mm a',
                        )}
                        deleteDisabled={
                          removeNote.isPending
                        }
                        desktop={
                          desktop
                        }
                        key={`note-${item.id}`}
                        kind="NOTE"
                        onDelete={() =>
                          confirmDeleteNote(
                            item,
                          )
                        }
                        onPress={() =>
                          openNote(item)
                        }
                        subtitle={
                          subject?.name
                        }
                        title={
                          item.title ??
                          'Untitled note'
                        }
                      />
                    );
                  },
                )}
              </View>

              {!gridItems.length ? (
                <View
                  style={[
                    styles.empty,
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
                      styles.emptyIcon,
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
                      size={30}
                    />
                  </View>

                  <Text
                    style={[
                      styles.emptyTitle,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    This folder is
                    empty
                  </Text>

                  <Text
                    style={[
                      styles.emptyCopy,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    Add a PDF,
                    material or note
                    to this folder.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
              {/* LIBRARY HOME */}
              <View
                style={
                  styles.mainHeader
                }
              >
                <View
                  style={
                    styles.mainTitleGroup
                  }
                >
                  <Text
                    style={[
                      styles.mainEyebrow,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    STUDY LIBRARY
                  </Text>

                  <Text
                    style={[
                      styles.mainTitle,
                      {
                        color:
                          palette.text,
                      },
                    ]}
                  >
                    Your folders
                  </Text>

                  <Text
                    style={[
                      styles.mainSubtitle,
                      {
                        color:
                          palette.textMuted,
                      },
                    ]}
                  >
                    Choose a subject
                    folder to open
                    its notes and
                    materials.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.folderWelcome,
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
                    styles.folderWelcomeIcon,
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
                    size={32}
                  />
                </View>

                <Text
                  style={[
                    styles.folderWelcomeTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Open a folder
                </Text>

                <Text
                  style={[
                    styles.folderWelcomeText,
                    {
                      color:
                        palette.textMuted,
                    },
                  ]}
                >
                  Choose one of your
                  folders to see its
                  PDFs, materials and
                  notes.
                </Text>
              </View>

              {/* CONTINUE */}
              <View
                style={
                  styles.sectionHeader
                }
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Continue studying
                </Text>
              </View>

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
                  } · Last opened ${format(
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
                  message="Open a PDF and your reading position will appear here."
                  title="No PDF in progress"
                />
              )}

              {/* NEXT SESSIONS */}
              <View
                style={
                  styles.nextHeader
                }
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  Next sessions
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      '/sessions',
                    )
                  }
                >
                  <Text
                    style={[
                      styles.viewAll,
                      {
                        color:
                          palette.accentStrong,
                      },
                    ]}
                  >
                    View all
                  </Text>
                </Pressable>
              </View>

              {activeSessions
                .slice(0, 3)
                .map((item) => {
                  const subject =
                    bySubject.get(
                      item.subject_id,
                    );

                  return (
                    <EntityCard
                      accent={
                        subject?.color
                      }
                      badge={`${item.planned_duration} MIN`}
                      key={item.id}
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
                            id: item.id,
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
                  );
                })}

              {!activeSessions.length ? (
                <FeedbackState
                  message="Create a study plan from an upcoming exam."
                  title="No sessions planned"
                />
              ) : null}

              {!desktop ? (
                <View
                  style={
                    styles.mobileActions
                  }
                >
                  <AppButton
                    icon="create-outline"
                    label="New note"
                    onPress={() =>
                      router.push(
                        '/notes/create',
                      )
                    }
                    style={
                      styles.mobileAction
                    }
                    variant="secondary"
                  />

                  <AppButton
                    icon="sparkles-outline"
                    label="Plan study"
                    onPress={() =>
                      router.push(
                        '/sessions/create-plan',
                      )
                    }
                    style={
                      styles.mobileAction
                    }
                    variant="secondary"
                  />
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </EntityList>
  );
}

function FolderRow({
  accent,
  active,
  compact,
  count,
  label,
  onPress,
}: {
  accent: string;
  active: boolean;
  compact: boolean;
  count: number;
  label: string;
  onPress: () => void;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.folderRow,
        compact &&
          styles.folderRowCompact,
        {
          backgroundColor:
            active
              ? palette.accentSoft
              : 'transparent',

          borderColor:
            active
              ? palette.border
              : 'transparent',

          opacity: pressed
            ? 0.7
            : 1,
        },
      ]}
    >
      <View
        style={[
          styles.folderMiniIcon,
          {
            backgroundColor:
              active
                ? palette.surface
                : palette.surfaceAlt,
          },
        ]}
      >
        <Ionicons
          color={accent}
          name={
            active
              ? 'folder-open'
              : 'folder-outline'
          }
          size={19}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.folderLabel,
          {
            color: palette.text,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.folderCount,
          {
            color:
              palette.textMuted,
          },
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function SidebarAction({
  icon,
  label,
  onPress,
}: {
  icon:
    | 'create-outline'
    | 'sparkles-outline'
    | 'calendar-outline';
  label: string;
  onPress: () => void;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.sidebarAction,
        {
          opacity: pressed
            ? 0.6
            : 1,
        },
      ]}
    >
      <Ionicons
        color={
          palette.accentStrong
        }
        name={icon}
        size={18}
      />

      <Text
        style={[
          styles.sidebarActionText,
          {
            color: palette.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FilterTab({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterTab,
        {
          backgroundColor:
            active
              ? palette.surface
              : 'transparent',

          opacity: pressed
            ? 0.7
            : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.filterLabel,
          {
            color: active
              ? palette.text
              : palette.textMuted,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CreateTile({
  desktop,
  onPress,
}: {
  desktop: boolean;
  onPress: () => void;
}) {
  const palette = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.fileTile,
        desktop
          ? styles.fileTileDesktop
          : styles.fileTileMobile,
        {
          opacity: pressed
            ? 0.7
            : 1,
        },
      ]}
    >
      <View
        style={[
          styles.createPreview,
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
            styles.createButton,
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
            size={26}
          />
        </View>
      </View>

      <Text
        style={[
          styles.fileTitle,
          {
            color: palette.text,
          },
        ]}
      >
        Create
      </Text>

      <Text
        style={[
          styles.fileDate,
          {
            color:
              palette.textMuted,
          },
        ]}
      >
        Add study material
      </Text>
    </Pressable>
  );
}

function FileTile({
  accent,
  badge,
  date,
  deleteDisabled,
  desktop,
  kind,
  onDelete,
  onPress,
  subtitle,
  title,
}: {
  accent: string;
  badge: string;
  date: string;
  deleteDisabled: boolean;
  desktop: boolean;
  kind:
    | 'PDF'
    | 'NOTE'
    | 'MATERIAL';
  onDelete: () => void;
  onPress: () => void;
  subtitle?: string | null;
  title: string;
}) {
  const palette = useAppTheme();

  const icon =
    kind === 'PDF'
      ? 'document-text-outline'
      : kind === 'NOTE'
        ? 'create-outline'
        : 'book-outline';

  return (
    <View
      style={[
        styles.fileTile,
        desktop
          ? styles.fileTileDesktop
          : styles.fileTileMobile,
      ]}
    >
      <View
        style={[
          styles.filePreview,
          {
            backgroundColor:
              palette.surfaceAlt,
            borderColor:
              palette.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={`Open ${title}`}
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.fileOpenArea,
            {
              opacity: pressed
                ? 0.72
                : 1,
            },
          ]}
        >
          <View
            style={[
              styles.previewAccent,
              {
                backgroundColor:
                  accent,
              },
            ]}
          />

          <View
            style={[
              styles.previewIcon,
              {
                backgroundColor:
                  palette.surface,
              },
            ]}
          >
            <Ionicons
              color={accent}
              name={icon}
              size={30}
            />
          </View>

          <View
            style={[
              styles.previewBadge,
              {
                backgroundColor:
                  palette.surface,
              },
            ]}
          >
            <Text
              style={[
                styles.previewBadgeText,
                {
                  color: accent,
                },
              ]}
            >
              {badge}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityLabel={`Delete ${title}`}
          accessibilityRole="button"
          disabled={
            deleteDisabled
          }
          onPress={onDelete}
          style={({ pressed }) => [
            styles.tileDelete,
            {
              backgroundColor:
                palette.surface,

              borderColor:
                palette.border,

              opacity:
                deleteDisabled
                  ? 0.35
                  : pressed
                    ? 0.55
                    : 1,
            },
          ]}
        >
          <Ionicons
            color={palette.danger}
            name="trash-outline"
            size={16}
          />
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={`Open ${title}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed
            ? 0.65
            : 1,
        })}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.fileTitle,
            {
              color: palette.text,
            },
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              styles.fileSubject,
              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}

        <Text
          style={[
            styles.fileDate,
            {
              color:
                palette.textMuted,
            },
          ]}
        >
          {date}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  workspace: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.lg,
  },

  workspaceMobile: {
    flexDirection: 'column',
  },

  sidebar: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    width: 220,
  },

  sidebarMobile: {
    width: '100%',
  },

  sidebarHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginBottom: spacing.md,
    paddingHorizontal:
      spacing.xs,
  },

  sidebarEyebrow: {
    ...typography.label,
    fontSize: 8,
  },

  sidebarTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
    lineHeight: 24,
  },

  addButton: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    height: 34,
    justifyContent:
      'center',
    width: 34,
  },

  folderList: {
    gap: 4,
  },

  folderListMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  folderRow: {
    alignItems: 'center',
    borderRadius:
      radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal:
      spacing.sm,
    paddingVertical: 5,
  },

  folderRowCompact: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 145,
  },

  folderMiniIcon: {
    alignItems: 'center',
    borderRadius: 9,
    height: 30,
    justifyContent:
      'center',
    width: 30,
  },

  folderLabel: {
    ...typography.body,
    flex: 1,
    fontFamily:
      'Inter_500Medium',
    fontSize: 13,
    lineHeight: 17,
  },

  folderCount: {
    ...typography.caption,
    fontSize: 10,
  },

  sidebarTools: {
    borderTopWidth: 1,
    gap: 4,
    marginTop:
      spacing.lg,
    paddingTop:
      spacing.lg,
  },

  sidebarAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal:
      spacing.sm,
    paddingVertical:
      spacing.sm,
  },

  sidebarActionText: {
    ...typography.body,
    fontSize: 13,
  },

  main: {
    flex: 1,
    gap: spacing.lg,
    minWidth: 0,
    width: '100%',
  },

  mainHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent:
      'space-between',
  },

  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minWidth: 0,
  },

  mainTitleGroup: {
    flex: 1,
    minWidth: 0,
  },

  mainEyebrow: {
    ...typography.label,
    fontSize: 8,
    marginBottom: 2,
  },

  mainTitle: {
    ...typography.title,
    fontSize: 30,
    lineHeight: 35,
  },

  mainSubtitle: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 3,
  },

  backButton: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent:
      'center',
    width: 42,
  },

  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  roundAction: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent:
      'center',
    width: 42,
  },

  folderWelcome: {
    alignItems: 'center',
    borderRadius:
      radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    justifyContent:
      'center',
    minHeight: 250,
    padding: spacing.xl,
  },

  folderWelcomeIcon: {
    alignItems: 'center',
    borderRadius:
      radii.lg,
    height: 64,
    justifyContent:
      'center',
    marginBottom:
      spacing.sm,
    width: 64,
  },

  folderWelcomeTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
  },

  folderWelcomeText: {
    ...typography.body,
    fontSize: 13,
    maxWidth: 330,
    textAlign: 'center',
  },

  searchBox: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal:
      spacing.md,
  },

  searchInput: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
  },

  filters: {
    alignSelf:
      'flex-start',
    borderRadius:
      radii.pill,
    flexDirection: 'row',
    padding: 4,
  },

  filterTab: {
    borderRadius:
      radii.pill,
    paddingHorizontal:
      spacing.lg,
    paddingVertical: 8,
  },

  filterLabel: {
    ...typography.body,
    fontFamily:
      'Inter_500Medium',
    fontSize: 13,
  },

  fileGrid: {
    alignItems:
      'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  fileTile: {
    gap: 5,
  },

  fileTileDesktop: {
    flexBasis: '28%',
    flexGrow: 1,
    maxWidth: 220,
    minWidth: 165,
  },

  fileTileMobile: {
    flexBasis: '44%',
    flexGrow: 1,
    minWidth: 145,
  },

  filePreview: {
    aspectRatio: 1.25,
    borderRadius:
      radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },

  fileOpenArea: {
    flex: 1,
    height: '100%',
    position: 'relative',
    width: '100%',
  },

  previewAccent: {
    height: 8,
    left: 0,
    opacity: 0.7,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  previewIcon: {
    alignItems: 'center',
    borderRadius:
      radii.lg,
    height: 64,
    justifyContent:
      'center',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    position: 'absolute',
    top: '50%',
    width: 64,
  },

  previewBadge: {
    borderRadius:
      radii.pill,
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
  },

  previewBadgeText: {
    ...typography.label,
    fontSize: 7,
  },

  tileDelete: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    borderWidth: 1,
    height: 30,
    justifyContent:
      'center',
    position: 'absolute',
    right: 8,
    top: 10,
    width: 30,
    zIndex: 10,
  },

  createPreview: {
    alignItems: 'center',
    aspectRatio: 1.25,
    borderRadius:
      radii.lg,
    borderWidth: 1,
    justifyContent:
      'center',
    width: '100%',
  },

  createButton: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    height: 52,
    justifyContent:
      'center',
    width: 52,
  },

  fileTitle: {
    ...typography.body,
    fontFamily:
      'Inter_500Medium',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 3,
  },

  fileSubject: {
    ...typography.caption,
    fontSize: 11,
  },

  fileDate: {
    ...typography.caption,
    fontSize: 10,
  },

  empty: {
    alignItems: 'center',
    borderRadius:
      radii.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
  },

  emptyIcon: {
    alignItems: 'center',
    borderRadius:
      radii.pill,
    height: 58,
    justifyContent:
      'center',
    width: 58,
  },

  emptyTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    marginTop:
      spacing.sm,
  },

  emptyCopy: {
    ...typography.body,
    fontSize: 13,
    maxWidth: 260,
    textAlign: 'center',
  },

  sectionHeader: {
    marginTop:
      spacing.md,
  },

  sectionTitle: {
    ...typography.sectionTitle,
    fontSize: 20,
  },

  nextHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginTop:
      spacing.md,
  },

  viewAll: {
    ...typography.caption,
    fontFamily:
      'Inter_500Medium',
    fontSize: 12,
  },

  mobileActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop:
      spacing.md,
  },

  mobileAction: {
    flex: 1,
  },
});