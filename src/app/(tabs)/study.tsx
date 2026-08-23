import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { AppButton } from '@/components/ui/AppButton';
import { EntityCard } from '@/components/ui/EntityCard';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { MotionIcon } from '@/components/ui/MotionIcon';

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

type FileTileProps = {
  badge?: string;
  compact: boolean;
  deleting?: boolean;
  icon:
    | 'document-text-outline'
    | 'reader-outline';
  kind: 'MATERIAL' | 'NOTE';
  metadata?: string;
  onDelete: () => void;
  onOpen: () => void;
  subtitle?: string;
  title: string;
};

type FolderCardProps = {
  compact: boolean;
  count: number;
  color?: string | null;
  name: string;
  onPress: () => void;
};

type FolderRowProps = {
  active: boolean;
  color?: string | null;
  count: number;
  label: string;
  onPress: () => void;
};

export default function StudyScreen() {
  const router = useRouter();
  const palette = useAppTheme();

  const { width } = useWindowDimensions();

  const desktop = width >= 860;
  const compact = width < 600;

  const materials = useMaterials();
  const notes = useNotes();
  const sessions = useSessions();
  const subjects = useSubjects();

  const [
    folderOpen,
    setFolderOpen,
  ] = useState(false);

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState<string | null>(null);

  const [
    filter,
    setFilter,
  ] = useState<LibraryFilter>('ALL');

  const [
    search,
    setSearch,
  ] = useState('');

  const bySubject = new Map(
    subjects.data?.map((subject) => [
      subject.id,
      subject,
    ]),
  );

  const loading =
    materials.isLoading ||
    notes.isLoading ||
    sessions.isLoading ||
    subjects.isLoading;

  const allMaterials = materials.data ?? [];
  const allNotes = notes.data ?? [];

  const totalFiles =
    allMaterials.length + allNotes.length;

  const continueMaterial = allMaterials
    .filter(
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

  const nextSessions = (sessions.data ?? [])
    .filter(
      (session) =>
        session.status === 'PLANNED' ||
        session.status === 'IN_PROGRESS',
    )
    .slice(0, 3);

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
      Alert.alert(
        'Could not delete material',
        getErrorMessage(error),
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
      Alert.alert(
        'Could not delete note',
        getErrorMessage(error),
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
      item.page_number
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
    const performDelete = () => {
      removeMaterial.mutate({
        id: item.id,
        path: item.file_url,
      });
    };

    const message =
      `Are you sure you want to delete "${item.title}"? ` +
      'This cannot be undone.';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      if (window.confirm(message)) {
        performDelete();
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
          onPress: performDelete,
        },
      ],
    );
  };

  const confirmDeleteNote = (
    item: NonNullable<
      typeof notes.data
    >[number],
  ) => {
    const noteTitle =
      item.title ??
      `Page ${
        item.page_number ?? '—'
      } note`;

    const performDelete = () => {
      removeNote.mutate(item.id);
    };

    const message =
      `Are you sure you want to delete "${noteTitle}"? ` +
      'This cannot be undone.';

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      if (window.confirm(message)) {
        performDelete();
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
          onPress: performDelete,
        },
      ],
    );
  };

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

  const selectedSubject =
    selectedSubjectId
      ? bySubject.get(
          selectedSubjectId,
        )
      : null;

  const folderTitle =
    selectedSubject?.name ??
    'All Files';

  const folderMaterials =
    allMaterials.filter((item) =>
      selectedSubjectId
        ? item.subject_id ===
          selectedSubjectId
        : true,
    );

  const folderNotes =
    allNotes.filter((item) =>
      selectedSubjectId
        ? item.subject_id ===
          selectedSubjectId
        : true,
    );

  const normalizedSearch = search
    .trim()
    .toLowerCase();

  const visibleMaterials =
    filter === 'NOTES'
      ? []
      : folderMaterials.filter(
          (item) => {
            if (!normalizedSearch) {
              return true;
            }

            const subject =
              bySubject.get(
                item.subject_id,
              );

            return [
              item.title,
              item.file_name,
              item.type,
              subject?.name,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(
                normalizedSearch,
              );
          },
        );

  const visibleNotes =
    filter === 'MATERIALS'
      ? []
      : folderNotes.filter(
          (item) => {
            if (!normalizedSearch) {
              return true;
            }

            const subject =
              bySubject.get(
                item.subject_id,
              );

            return [
              item.title,
              item.content,
              subject?.name,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(
                normalizedSearch,
              );
          },
        );

  const folderItemCount =
    folderMaterials.length +
    folderNotes.length;

  const visibleCount =
    visibleMaterials.length +
    visibleNotes.length;

  const subjectItemCount = (
    subjectId: string,
  ) =>
    allMaterials.filter(
      (item) =>
        item.subject_id === subjectId,
    ).length +
    allNotes.filter(
      (item) =>
        item.subject_id === subjectId,
    ).length;

  const folderNavigation = desktop ? (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor:
            palette.surfaceAlt,
          borderColor:
            palette.border,
        },
      ]}
    >
      <View
        style={
          styles.sidebarHeading
        }
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
          LIBRARY
        </Text>

        <Text
          style={[
            styles.sidebarTitle,
            {
              color: palette.text,
            },
          ]}
        >
          Folders
        </Text>
      </View>

      <FolderRow
        active={
          folderOpen &&
          selectedSubjectId === null
        }
        count={totalFiles}
        label="All Files"
        onPress={() =>
          openFolder(null)
        }
      />

      {(subjects.data ?? []).map(
        (subject) => (
          <FolderRow
            active={
              folderOpen &&
              selectedSubjectId ===
                subject.id
            }
            color={subject.color}
            count={subjectItemCount(
              subject.id,
            )}
            key={subject.id}
            label={subject.name}
            onPress={() =>
              openFolder(
                subject.id,
              )
            }
          />
        ),
      )}

      <View
        style={
          styles.sidebarBottom
        }
      >
        <AppButton
          icon="add-outline"
          label="Add material"
          onPress={() =>
            router.push(
              '/materials/create',
            )
          }
          variant="secondary"
        />

        <AppButton
          icon="document-text-outline"
          label="New note"
          onPress={() =>
            router.push(
              '/notes/create',
            )
          }
          variant="ghost"
        />
      </View>
    </View>
  ) : (
    <View
      style={[
        styles.mobileFolders,
        compact &&
          styles.mobileFoldersCompact,
      ]}
    >
      <ScrollView
        contentContainerStyle={
          styles.mobileFolderContent
        }
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
      >
        <Pressable
          onPress={() =>
            openFolder(null)
          }
          style={[
            styles.mobileFolderChip,
            compact &&
              styles.mobileFolderChipCompact,
            {
              backgroundColor:
                folderOpen &&
                selectedSubjectId ===
                  null
                  ? palette.accentSoft
                  : palette.surface,

              borderColor:
                folderOpen &&
                selectedSubjectId ===
                  null
                  ? palette.accent
                  : palette.border,
            },
          ]}
        >
          <Ionicons
            color={palette.text}
            name="folder-outline"
            size={
              compact ? 17 : 19
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.mobileFolderText,
              compact &&
                styles.mobileFolderTextCompact,
              {
                color:
                  palette.text,
              },
            ]}
          >
            All Files
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
            {totalFiles}
          </Text>
        </Pressable>

        {(subjects.data ?? []).map(
          (subject) => {
            const active =
              folderOpen &&
              selectedSubjectId ===
                subject.id;

            return (
              <Pressable
                key={subject.id}
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
                        ? subject.color ??
                          palette.accent
                        : palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.mobileFolderDot,
                    {
                      backgroundColor:
                        subject.color ??
                        palette.accent,
                    },
                  ]}
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.mobileFolderText,
                    compact &&
                      styles.mobileFolderTextCompact,
                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  {subject.name}
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
                  {subjectItemCount(
                    subject.id,
                  )}
                </Text>
              </Pressable>
            );
          },
        )}
      </ScrollView>
    </View>
  );

  const folderDashboard =
    !folderOpen ? (
      <View
        style={[
          styles.dashboard,
          compact &&
            styles.dashboardCompact,
        ]}
      >
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
              color={palette.accent}
              iconSize={
                compact ? 17 : 20
              }
              loop
              name="ribbon-outline"
              size={
                compact ? 36 : 44
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

            {!compact ? (
              <Ionicons
                color={
                  palette.lavender
                }
                name="sparkles-outline"
                size={18}
              />
            ) : null}
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
            Keep your PDFs,
            materials and notes
            organized by subject.
          </Text>

          <View
            style={[
              styles.actions,
              compact &&
                styles.actionsCompact,
            ]}
          >
            <AppButton
              icon="add-outline"
              label="Material"
              onPress={() =>
                router.push(
                  '/materials/create',
                )
              }
              style={styles.action}
              variant="secondary"
            />

            <AppButton
              icon="document-text-outline"
              label="Note"
              onPress={() =>
                router.push(
                  '/notes/create',
                )
              }
              style={styles.action}
              variant="secondary"
            />

            {!compact ? (
              <AppButton
                icon="sparkles-outline"
                label="Plan"
                onPress={() =>
                  router.push(
                    '/sessions/create-plan',
                  )
                }
                style={styles.action}
                variant="secondary"
              />
            ) : null}
          </View>
        </View>

        <SectionTitle
          compact={compact}
          color={palette.text}
          title="Your folders"
        />

        <View
          style={[
            styles.folderGrid,
            compact &&
              styles.folderGridCompact,
          ]}
        >
          <FolderCard
            compact={compact}
            count={totalFiles}
            name="All Files"
            onPress={() =>
              openFolder(null)
            }
          />

          {(subjects.data ?? []).map(
            (subject) => (
              <FolderCard
                color={subject.color}
                compact={compact}
                count={subjectItemCount(
                  subject.id,
                )}
                key={subject.id}
                name={subject.name}
                onPress={() =>
                  openFolder(
                    subject.id,
                  )
                }
              />
            ),
          )}
        </View>

        <SectionTitle
          compact={compact}
          color={palette.text}
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
            message="Open a PDF and it will appear here."
            title="No PDF in progress"
          />
        )}

        <SectionTitle
          compact={compact}
          color={palette.text}
          title="Next sessions"
        />

        {nextSessions.map(
          (item) => {
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
                title={item.topic}
              />
            );
          },
        )}

        {!nextSessions.length ? (
          <FeedbackState
            message="Create a study plan when you are ready."
            title="No sessions planned"
          />
        ) : null}
      </View>
    ) : null;

  const openFolderView =
    folderOpen ? (
      <View
        style={[
          styles.folderView,
          compact &&
            styles.folderViewCompact,
        ]}
      >
        <View
          style={[
            styles.folderHeader,
            compact &&
              styles.folderHeaderCompact,
          ]}
        >
          <Pressable
            accessibilityLabel="Back to folders"
            accessibilityRole="button"
            onPress={closeFolder}
            style={[
              styles.backButton,
              compact &&
                styles.backButtonCompact,
              {
                backgroundColor:
                  palette.surface,
                borderColor:
                  palette.border,
              },
            ]}
          >
            <Ionicons
              color={palette.text}
              name="chevron-back"
              size={
                compact ? 19 : 22
              }
            />
          </Pressable>

          <View
            style={
              styles.folderHeaderCopy
            }
          >
            <View
              style={
                styles.folderTitleRow
              }
            >
              {selectedSubject ? (
                <View
                  style={[
                    styles.folderTitleDot,
                    {
                      backgroundColor:
                        selectedSubject.color ??
                        palette.accent,
                    },
                  ]}
                />
              ) : (
                <Ionicons
                  color={
                    palette.accentStrong
                  }
                  name="folder-open-outline"
                  size={
                    compact ? 20 : 24
                  }
                />
              )}

              <Text
                numberOfLines={1}
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
                {folderTitle}
              </Text>
            </View>

            <Text
              style={[
                styles.folderSubtitle,
                compact &&
                  styles.folderSubtitleCompact,
                {
                  color:
                    palette.textMuted,
                },
              ]}
            >
              {folderItemCount}{' '}
              {folderItemCount === 1
                ? 'item'
                : 'items'}
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
              styles.headerAddButton,
              compact &&
                styles.headerAddButtonCompact,
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
                compact ? 20 : 22
              }
            />
          </Pressable>
        </View>

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
              compact ? 18 : 20
            }
          />

          <TextInput
            onChangeText={setSearch}
            placeholder="Search this folder"
            placeholderTextColor={
              palette.textMuted
            }
            style={[
              styles.searchInput,
              compact &&
                styles.searchInputCompact,
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
              onPress={() =>
                setSearch('')
              }
            >
              <Ionicons
                color={
                  palette.textMuted
                }
                name="close-circle"
                size={18}
              />
            </Pressable>
          ) : null}
        </View>

        <View
          style={[
            styles.filters,
            compact &&
              styles.filtersCompact,
          ]}
        >
          <FilterChip
            active={
              filter === 'ALL'
            }
            compact={compact}
            count={folderItemCount}
            label="All"
            onPress={() =>
              setFilter('ALL')
            }
          />

          <FilterChip
            active={
              filter ===
              'MATERIALS'
            }
            compact={compact}
            count={
              folderMaterials.length
            }
            label="Materials"
            onPress={() =>
              setFilter(
                'MATERIALS',
              )
            }
          />

          <FilterChip
            active={
              filter === 'NOTES'
            }
            compact={compact}
            count={
              folderNotes.length
            }
            label="Notes"
            onPress={() =>
              setFilter('NOTES')
            }
          />
        </View>

        {visibleCount ? (
          <View
            style={[
              styles.fileGrid,
              compact &&
                styles.fileGridCompact,
            ]}
          >
            <Pressable
              accessibilityLabel="Add a new study material"
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  '/materials/create',
                )
              }
              style={({ pressed }) => [
                styles.createTile,
                compact &&
                  styles.fileTileCompact,
                {
                  backgroundColor:
                    palette.surfaceAlt,
                  borderColor:
                    palette.border,
                  opacity:
                    pressed
                      ? 0.68
                      : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.createCircle,
                  compact &&
                    styles.createCircleCompact,
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
                    compact ? 23 : 28
                  }
                />
              </View>

              <Text
                style={[
                  styles.createTitle,
                  compact &&
                    styles.createTitleCompact,
                  {
                    color:
                      palette.text,
                  },
                ]}
              >
                Add file
              </Text>

              {!compact ? (
                <Text
                  style={[
                    styles.createCaption,
                    {
                      color:
                        palette.textMuted,
                    },
                  ]}
                >
                  PDF or material
                </Text>
              ) : null}
            </Pressable>

            {visibleMaterials.map(
              (item) => {
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
                    badge={
                      item.favorite
                        ? 'Favorite'
                        : progress !==
                            null
                          ? `${progress}%`
                          : item.type
                    }
                    compact={compact}
                    deleting={
                      removeMaterial.isPending
                    }
                    icon={
                      item.type === 'PDF'
                        ? 'reader-outline'
                        : 'document-text-outline'
                    }
                    key={`material-${item.id}`}
                    kind="MATERIAL"
                    metadata={
                      item.completed
                        ? 'Completed'
                        : progress !==
                            null
                          ? `Page ${item.last_read_page} of ${item.page_count}`
                          : item.file_name ??
                            'Study material'
                    }
                    onDelete={() =>
                      confirmDeleteMaterial(
                        item,
                      )
                    }
                    onOpen={() =>
                      openMaterial(
                        item,
                      )
                    }
                    subtitle={
                      subject?.name
                    }
                    title={item.title}
                  />
                );
              },
            )}

            {visibleNotes.map(
              (item) => {
                const subject =
                  bySubject.get(
                    item.subject_id,
                  );

                return (
                  <FileTile
                    badge={
                      item.favorite
                        ? 'Favorite'
                        : item.page_number
                          ? `Page ${item.page_number}`
                          : 'Note'
                    }
                    compact={compact}
                    deleting={
                      removeNote.isPending
                    }
                    icon="document-text-outline"
                    key={`note-${item.id}`}
                    kind="NOTE"
                    metadata={format(
                      new Date(
                        item.updated_at,
                      ),
                      'MMM d',
                    )}
                    onDelete={() =>
                      confirmDeleteNote(
                        item,
                      )
                    }
                    onOpen={() =>
                      openNote(item)
                    }
                    subtitle={
                      subject?.name
                    }
                    title={
                      item.title ??
                      `Page ${
                        item.page_number ??
                        '—'
                      } note`
                    }
                  />
                );
              },
            )}
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
                color={palette.text}
                name="folder-outline"
                size={
                  compact ? 20 : 23
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
                style={({ pressed }) => [
                  styles.emptyAdd,
                  compact &&
                    styles.emptyAddCompact,
                  {
                    backgroundColor:
                      palette.accentSoft,
                    opacity:
                      pressed
                        ? 0.65
                        : 1,
                  },
                ]}
              >
                <Ionicons
                  color={
                    palette.accentStrong
                  }
                  name="add-outline"
                  size={16}
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
    ) : null;

  return (
    <EntityList
      description="Your personal library for materials, notes and focused study."
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
      {!desktop
        ? folderNavigation
        : null}

      <View
        style={[
          styles.libraryLayout,
          desktop &&
            styles.libraryLayoutDesktop,
          compact &&
            styles.libraryLayoutCompact,
        ]}
      >
        {desktop
          ? folderNavigation
          : null}

        <View
          style={[
            styles.mainContent,
            compact &&
              styles.mainContentCompact,
          ]}
        >
          {folderDashboard}

          {openFolderView}
        </View>
      </View>
    </EntityList>
  );

  function FilterChip({
    active,
    compact: chipCompact,
    count,
    label,
    onPress,
  }: {
    active: boolean;
    compact: boolean;
    count: number;
    label: string;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          selected: active,
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.filterChip,
          chipCompact &&
            styles.filterChipCompact,
          {
            backgroundColor:
              active
                ? palette.accentSoft
                : palette.surface,

            borderColor:
              active
                ? palette.accent
                : palette.border,

            opacity:
              pressed ? 0.68 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.filterText,
            chipCompact &&
              styles.filterTextCompact,
            {
              color:
                active
                  ? palette.accentStrong
                  : palette.text,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.filterCount,
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

  function FolderRow({
    active,
    color,
    count,
    label,
    onPress,
  }: FolderRowProps) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          selected: active,
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.folderRow,
          {
            backgroundColor:
              active
                ? palette.accentSoft
                : pressed
                  ? palette.surface
                  : 'transparent',

            borderColor:
              active
                ? palette.border
                : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.folderRowIcon,
            {
              backgroundColor:
                color ??
                palette.accent,
            },
          ]}
        >
          <Ionicons
            color="#FFFFFF"
            name={
              active
                ? 'folder-open'
                : 'folder'
            }
            size={16}
          />
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.folderRowLabel,
            {
              color:
                palette.text,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          style={[
            styles.folderRowCount,
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
}

function FolderCard({
  compact,
  count,
  color,
  name,
  onPress,
}: FolderCardProps) {
  const palette =
    useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.folderCard,
        compact &&
          styles.folderCardCompact,
        {
          backgroundColor:
            palette.surface,
          borderColor:
            palette.border,
          opacity:
            pressed ? 0.68 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.folderCardTop,
          compact &&
            styles.folderCardTopCompact,
        ]}
      >
        <View
          style={[
            styles.folderCardIcon,
            compact &&
              styles.folderCardIconCompact,
            {
              backgroundColor:
                color ??
                palette.accentSoft,
            },
          ]}
        >
          <Ionicons
            color={
              color
                ? '#FFFFFF'
                : palette.accentStrong
            }
            name="folder"
            size={
              compact ? 19 : 24
            }
          />
        </View>

        <Ionicons
          color={
            palette.textMuted
          }
          name="chevron-forward"
          size={
            compact ? 16 : 18
          }
        />
      </View>

      <View
        style={
          styles.folderCardCopy
        }
      >
        <Text
          numberOfLines={2}
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
          {name}
        </Text>

        <Text
          style={[
            styles.folderCardCount,
            compact &&
              styles.folderCardCountCompact,
            {
              color:
                palette.textMuted,
            },
          ]}
        >
          {count}{' '}
          {count === 1
            ? 'item'
            : 'items'}
        </Text>
      </View>
    </Pressable>
  );
}

function FileTile({
  badge,
  compact,
  deleting,
  icon,
  kind,
  metadata,
  onDelete,
  onOpen,
  subtitle,
  title,
}: FileTileProps) {
  const palette =
    useAppTheme();

  return (
    <View
      style={[
        styles.fileTile,
        compact &&
          styles.fileTileCompact,
        {
          backgroundColor:
            palette.surface,
          borderColor:
            palette.border,
          opacity:
            deleting ? 0.55 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.filePreview,
          compact &&
            styles.filePreviewCompact,
          {
            backgroundColor:
              kind === 'NOTE'
                ? palette.lavenderSoft
                : palette.accentSoft,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={`Open ${title}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={
            styles.fileOpenArea
          }
        >
          <View
            style={[
              styles.fileDocumentIcon,
              compact &&
                styles.fileDocumentIconCompact,
              {
                backgroundColor:
                  palette.surface,
              },
            ]}
          >
            <Ionicons
              color={
                kind === 'NOTE'
                  ? palette.lavender
                  : palette.accentStrong
              }
              name={icon}
              size={
                compact ? 24 : 31
              }
            />
          </View>

          {badge ? (
            <View
              style={[
                styles.fileBadge,
                compact &&
                  styles.fileBadgeCompact,
                {
                  backgroundColor:
                    palette.surface,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.fileBadgeText,
                  compact &&
                    styles.fileBadgeTextCompact,
                  {
                    color:
                      palette.textMuted,
                  },
                ]}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          accessibilityLabel={`Delete ${title}`}
          accessibilityRole="button"
          disabled={deleting}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.tileDelete,
            compact &&
              styles.tileDeleteCompact,
            {
              backgroundColor:
                palette.surface,
              borderColor:
                palette.border,
              opacity:
                deleting
                  ? 0.4
                  : pressed
                    ? 0.65
                    : 1,
            },
          ]}
        >
          <Ionicons
            color={palette.danger}
            name="trash-outline"
            size={
              compact ? 15 : 17
            }
          />
        </Pressable>
      </View>

      <Pressable
        accessibilityLabel={`Open ${title}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={[
          styles.fileInfo,
          compact &&
            styles.fileInfoCompact,
        ]}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.fileTitle,
            compact &&
              styles.fileTitleCompact,
            {
              color:
                palette.text,
            },
          ]}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              styles.fileSubtitle,
              compact &&
                styles.fileSubtitleCompact,
              {
                color:
                  palette.accentStrong,
              },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}

        {metadata ? (
          <Text
            numberOfLines={1}
            style={[
              styles.fileMetadata,
              compact &&
                styles.fileMetadataCompact,
              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            {metadata}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

function SectionTitle({
  color,
  compact,
  title,
}: {
  color: string;
  compact: boolean;
  title: string;
}) {
  return (
    <View
      style={[
        styles.sectionHeading,
        compact &&
          styles.sectionHeadingCompact,
      ]}
    >
      <Text
        style={[
          styles.section,
          compact &&
            styles.sectionCompact,
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
    libraryLayout: {
      width: '100%',
    },

    libraryLayoutDesktop: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: spacing.lg,
    },

    libraryLayoutCompact: {
      gap: 10,
    },

    mainContent: {
      flex: 1,
      gap: spacing.md,
      minWidth: 0,
    },

    mainContentCompact: {
      gap: 10,
    },

    dashboard: {
      gap: spacing.md,
    },

    dashboardCompact: {
      gap: 10,
    },

    sidebar: {
      borderRadius: radii.xl,
      borderWidth: 1,
      gap: 5,
      padding: 12,
      width: 210,
    },

    sidebarHeading: {
      gap: 2,
      marginBottom: 6,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },

    sidebarEyebrow: {
      ...typography.label,
      fontSize: 9,
      opacity: 0.65,
    },

    sidebarTitle: {
      ...typography.sectionTitle,
      fontSize: 19,
      lineHeight: 24,
    },

    folderRow: {
      alignItems: 'center',
      borderRadius: 11,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 9,
      minHeight: 42,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    folderRowIcon: {
      alignItems: 'center',
      borderRadius: 9,
      height: 29,
      justifyContent: 'center',
      width: 29,
    },

    folderRowLabel: {
      ...typography.body,
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },

    folderRowCount: {
      ...typography.caption,
      fontSize: 10,
    },

    sidebarBottom: {
      gap: 6,
      marginTop: 10,
    },

    mobileFolders: {
      marginBottom: spacing.sm,
      width: '100%',
    },

    mobileFoldersCompact: {
      marginBottom: 6,
    },

    mobileFolderContent: {
      gap: 7,
      paddingRight: spacing.sm,
    },

    mobileFolderChip: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      height: 40,
      maxWidth: 190,
      paddingHorizontal: 11,
    },

    mobileFolderChipCompact: {
      gap: 5,
      height: 34,
      maxWidth: 155,
      paddingHorizontal: 9,
    },

    mobileFolderText: {
      ...typography.body,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
      maxWidth: 120,
    },

    mobileFolderTextCompact: {
      fontSize: 11,
      lineHeight: 15,
      maxWidth: 92,
    },

    mobileFolderCount: {
      ...typography.caption,
      fontSize: 9,
    },

    mobileFolderDot: {
      borderRadius: 6,
      height: 10,
      width: 10,
    },

    ritual: {
      borderRadius: radii.xl,
      borderWidth: 1,
      gap: spacing.md,
      overflow: 'hidden',
      padding: spacing.lg,
    },

    ritualCompact: {
      borderRadius: 16,
      gap: 9,
      padding: 13,
    },

    ritualHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.md,
    },

    ritualCopy: {
      flex: 1,
      gap: 1,
    },

    ritualEyebrow: {
      ...typography.label,
      fontSize: 9,
    },

    ritualTitle: {
      ...typography.sectionTitle,
      fontSize: 21,
      lineHeight: 27,
    },

    ritualTitleCompact: {
      fontSize: 17,
      lineHeight: 22,
    },

    ritualDescription: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
    },

    ritualDescriptionCompact: {
      fontSize: 12,
      lineHeight: 17,
    },

    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    actionsCompact: {
      gap: 6,
    },

    action: {
      flex: 1,
    },

    sectionHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },

    sectionHeadingCompact: {
      gap: 7,
      marginTop: 6,
    },

    section: {
      ...typography.sectionTitle,
      fontSize: 20,
      lineHeight: 26,
    },

    sectionCompact: {
      fontSize: 17,
      lineHeight: 22,
    },

    sectionRule: {
      flex: 1,
      height: 1,
      marginLeft: spacing.xs,
      opacity: 0.14,
    },

    folderGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },

    folderGridCompact: {
      gap: 7,
    },

    folderCard: {
      borderRadius: 17,
      borderWidth: 1,
      gap: 12,
      justifyContent:
        'space-between',
      minHeight: 116,
      padding: 14,
      width: 180,
    },

    folderCardCompact: {
      borderRadius: 13,
      gap: 7,
      minHeight: 82,
      padding: 10,
      width: '48%',
    },

    folderCardTop: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent:
        'space-between',
    },

    folderCardTopCompact: {
      minHeight: 30,
    },

    folderCardIcon: {
      alignItems: 'center',
      borderRadius: 12,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },

    folderCardIconCompact: {
      borderRadius: 9,
      height: 32,
      width: 32,
    },

    folderCardCopy: {
      gap: 2,
    },

    folderCardTitle: {
      ...typography.sectionTitle,
      fontSize: 16,
      lineHeight: 21,
    },

    folderCardTitleCompact: {
      fontSize: 13,
      lineHeight: 17,
    },

    folderCardCount: {
      ...typography.caption,
      fontSize: 10,
    },

    folderCardCountCompact: {
      fontSize: 9,
    },

    folderView: {
      gap: 14,
      width: '100%',
    },

    folderViewCompact: {
      gap: 9,
    },

    folderHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },

    folderHeaderCompact: {
      gap: 8,
    },

    backButton: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },

    backButtonCompact: {
      height: 34,
      width: 34,
    },

    folderHeaderCopy: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },

    folderTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 7,
    },

    folderTitleDot: {
      borderRadius: 7,
      height: 13,
      width: 13,
    },

    folderTitle: {
      ...typography.sectionTitle,
      flex: 1,
      fontSize: 24,
      lineHeight: 30,
    },

    folderTitleCompact: {
      fontSize: 18,
      lineHeight: 23,
    },

    folderSubtitle: {
      ...typography.caption,
      fontSize: 11,
    },

    folderSubtitleCompact: {
      fontSize: 9,
    },

    headerAddButton: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },

    headerAddButtonCompact: {
      height: 34,
      width: 34,
    },

    searchBox: {
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 9,
      minHeight: 46,
      paddingHorizontal: 13,
    },

    searchBoxCompact: {
      borderRadius: 11,
      gap: 7,
      minHeight: 38,
      paddingHorizontal: 10,
    },

    searchInput: {
      ...typography.body,
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      minWidth: 0,
      outlineStyle: 'none',
    } as never,

    searchInputCompact: {
      fontSize: 12,
      lineHeight: 17,
    },

    filters: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    filtersCompact: {
      gap: 5,
    },

    filterChip: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 12,
    },

    filterChipCompact: {
      gap: 4,
      minHeight: 30,
      paddingHorizontal: 9,
    },

    filterText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },

    filterTextCompact: {
      fontSize: 9,
    },

    filterCount: {
      ...typography.caption,
      fontSize: 9,
    },

    fileGrid: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      width: '100%',
    },

    fileGridCompact: {
      gap: 7,
    },

    fileTile: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      width: 176,
    },

    fileTileCompact: {
      borderRadius: 12,
      width: '48%',
    },

    filePreview: {
      height: 122,
      position: 'relative',
      width: '100%',
    },

    filePreviewCompact: {
      height: 82,
    },

    fileOpenArea: {
      alignItems: 'center',
      flex: 1,
      height: '100%',
      justifyContent: 'center',
      position: 'relative',
      width: '100%',
    },

    fileDocumentIcon: {
      alignItems: 'center',
      borderRadius: 14,
      height: 58,
      justifyContent: 'center',
      width: 50,
    },

    fileDocumentIconCompact: {
      borderRadius: 10,
      height: 43,
      width: 39,
    },

    tileDelete: {
      alignItems: 'center',
      borderRadius: radii.pill,
      borderWidth: 1,
      height: 32,
      justifyContent: 'center',
      position: 'absolute',
      right: 7,
      top: 7,
      width: 32,
      zIndex: 5,
    },

    tileDeleteCompact: {
      height: 27,
      right: 5,
      top: 5,
      width: 27,
    },

    fileBadge: {
      borderRadius: radii.pill,
      bottom: 7,
      left: 7,
      maxWidth: 110,
      paddingHorizontal: 8,
      paddingVertical: 3,
      position: 'absolute',
    },

    fileBadgeCompact: {
      bottom: 5,
      left: 5,
      maxWidth: 78,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },

    fileBadgeText: {
      ...typography.caption,
      fontSize: 9,
      fontWeight: '700',
    },

    fileBadgeTextCompact: {
      fontSize: 8,
    },

    fileInfo: {
      gap: 3,
      minHeight: 88,
      padding: 11,
    },

    fileInfoCompact: {
      gap: 1,
      minHeight: 66,
      padding: 8,
    },

    fileTitle: {
      ...typography.body,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
    },

    fileTitleCompact: {
      fontSize: 11,
      lineHeight: 14,
    },

    fileSubtitle: {
      ...typography.caption,
      fontSize: 9,
      fontWeight: '700',
    },

    fileSubtitleCompact: {
      fontSize: 8,
    },

    fileMetadata: {
      ...typography.caption,
      fontSize: 9,
    },

    fileMetadataCompact: {
      fontSize: 8,
    },

    createTile: {
      alignItems: 'center',
      borderRadius: 16,
      borderStyle: 'dashed',
      borderWidth: 1,
      gap: 7,
      height: 212,
      justifyContent: 'center',
      padding: 12,
      width: 176,
    },

    createCircle: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 52,
      justifyContent: 'center',
      width: 52,
    },

    createCircleCompact: {
      height: 40,
      width: 40,
    },

    createTitle: {
      ...typography.body,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 18,
      textAlign: 'center',
    },

    createTitleCompact: {
      fontSize: 11,
      lineHeight: 14,
    },

    createCaption: {
      ...typography.caption,
      fontSize: 9,
      textAlign: 'center',
    },

    emptyFolder: {
      alignItems: 'center',
      borderRadius: 22,
      borderWidth: 1,
      gap: 7,
      justifyContent: 'center',
      minHeight: 160,
      paddingHorizontal: 22,
      paddingVertical: 20,
      width: '100%',
    },

    emptyFolderCompact: {
      borderRadius: 16,
      gap: 4,
      minHeight: 112,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },

    emptyFolderIcon: {
      alignItems: 'center',
      borderRadius: radii.pill,
      height: 50,
      justifyContent: 'center',
      marginBottom: 1,
      width: 50,
    },

    emptyFolderIconCompact: {
      height: 40,
      width: 40,
    },

    emptyFolderTitle: {
      ...typography.sectionTitle,
      fontSize: 17,
      lineHeight: 22,
      textAlign: 'center',
    },

    emptyFolderTitleCompact: {
      fontSize: 14,
      lineHeight: 18,
    },

    emptyFolderDescription: {
      ...typography.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },

    emptyFolderDescriptionCompact: {
      fontSize: 11,
      lineHeight: 15,
    },

    emptyAdd: {
      alignItems: 'center',
      borderRadius: radii.pill,
      flexDirection: 'row',
      gap: 4,
      marginTop: 4,
      minHeight: 32,
      paddingHorizontal: 10,
    },

    emptyAddCompact: {
      marginTop: 2,
      minHeight: 28,
      paddingHorizontal: 8,
    },

    emptyAddText: {
      ...typography.caption,
      fontSize: 9,
      fontWeight: '700',
    },
  });