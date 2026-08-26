import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAssistantScreenContext } from '@/components/assistant/AssistantProvider';
import { AppButton } from '@/components/ui/AppButton';
import { EntityList } from '@/components/ui/EntityList';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FolderIcon } from '@/components/ui/FolderIcon';

import { radii, spacing, typography } from '@/constants/theme';

import {
  useMaterials,
  useNotes,
  useSessions,
  useSubjectMap,
  useSubjects,
} from '@/hooks/useStudyData';

import { useAppTheme } from '@/hooks/useAppTheme';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { pdfReadingProgress } from '@/lib/pdf/progress';
import { useTheme } from '@/providers/ThemeProvider';

import {
  deleteMaterial as deleteMaterialService,
  deleteRecord,
  getFolderSkinUrl,
} from '@/services';

type LibraryFilter = 'ALL' | 'MATERIALS' | 'NOTES';

const UNFILED_ID = '__unfiled__';

export default function StudyScreen() {
  const router = useRouter();

  const palette = useAppTheme();

  const { folderPack } = useTheme();

  const { width, height } = useWindowDimensions();

  /*
   * IMPORTANT:
   *
   * Landscape gets its own layout.
   * iPad portrait will NOT accidentally
   * use desktop sidebar layout anymore.
   */
  const landscape = width > height;

  const splitLandscape = landscape && width >= 1024 && height >= 600;

  const shortLandscape = landscape && height < 600;

  const compact = !splitLandscape && (width < 900 || shortLandscape);

  const phone = width < 600;

  const materials = useMaterials();

  const notes = useNotes();

  const sessions = useSessions();

  const subjects = useSubjects();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [filter, setFilter] = useState<LibraryFilter>('ALL');

  const [search, setSearch] = useState('');

  const bySubject = useSubjectMap();

  useAssistantScreenContext(
    useMemo(
      () => ({
        type: filter === 'NOTES' ? 'note' : 'study_material',
        label: filter === 'NOTES' ? 'Notes' : filter === 'MATERIALS' ? 'Study Materials' : 'Study',
      }),
      [filter],
    ),
  );

  const loading =
    materials.isLoading || notes.isLoading || sessions.isLoading || subjects.isLoading;

  const selectedSubject = selectedSubjectId ? bySubject.get(selectedSubjectId) : undefined;

  const removeMaterial = useMutation({
    mutationFn: ({
      id,
      path,
    }: {
      id: string;

      path?: string | null;
    }) => deleteMaterialService(id, path),

    onSuccess: async () => {
      await Promise.all([materials.refetch(), notes.refetch()]);
    },

    onError: (error) => {
      Alert.alert('Could not delete material', getErrorMessage(error));
    },
  });

  const removeNote = useMutation({
    mutationFn: (id: string) => deleteRecord('notes', id),

    onSuccess: async () => {
      await notes.refetch();
    },

    onError: (error) => {
      Alert.alert('Could not delete note', getErrorMessage(error));
    },
  });

  const openMaterial = (item: NonNullable<typeof materials.data>[number]) => {
    if (item.type === 'PDF' && item.file_url) {
      router.push(`/materials/${item.id}/reader` as never);

      return;
    }

    router.push({
      pathname: '/materials/[id]',

      params: {
        id: item.id,
      },
    });
  };

  const openNote = (item: NonNullable<typeof notes.data>[number]) => {
    if (item.material_id && item.page_number) {
      router.push({
        pathname: '/materials/[id]/reader',

        params: {
          id: item.material_id,

          page: String(item.page_number),
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

  const confirmDeleteMaterial = (item: NonNullable<typeof materials.data>[number]) => {
    confirmDestructive('Delete material?', `"${item.title}" will be permanently removed.`, () =>
      removeMaterial.mutate({ id: item.id, path: item.file_url }),
    );
  };

  const confirmDeleteNote = (item: NonNullable<typeof notes.data>[number]) => {
    const title = item.title ?? `Page ${item.page_number ?? '—'} note`;

    confirmDestructive('Delete note?', `"${title}" will be permanently removed.`, () =>
      removeNote.mutate(item.id),
    );
  };

  const openFolder = (subjectId: string) => {
    setSelectedSubjectId(subjectId);

    setFilter('ALL');

    setSearch('');
  };

  const closeFolder = () => {
    setSelectedSubjectId(null);

    setFilter('ALL');

    setSearch('');
  };

  const getFolderCounts = (subjectId: string) => {
    const materialCount =
      materials.data?.filter((item) => item.subject_id === subjectId).length ?? 0;

    const noteCount = notes.data?.filter((item) => item.subject_id === subjectId).length ?? 0;

    return {
      materialCount,
      noteCount,

      total: materialCount + noteCount,
    };
  };

  const unfiledMaterials = useMemo(
    () => materials.data?.filter((item) => !bySubject.get(item.subject_id)) ?? [],

    [materials.data, bySubject],
  );

  const unfiledNotes = useMemo(
    () => notes.data?.filter((item) => !bySubject.get(item.subject_id)) ?? [],

    [notes.data, bySubject],
  );

  const folderMaterials = useMemo(() => {
    if (selectedSubjectId === UNFILED_ID) return unfiledMaterials;

    return selectedSubjectId
      ? (materials.data?.filter((item) => item.subject_id === selectedSubjectId) ?? [])
      : [];
  }, [materials.data, selectedSubjectId, unfiledMaterials]);

  const folderNotes = useMemo(() => {
    if (selectedSubjectId === UNFILED_ID) return unfiledNotes;

    return selectedSubjectId
      ? (notes.data?.filter((item) => item.subject_id === selectedSubjectId) ?? [])
      : [];
  }, [notes.data, selectedSubjectId, unfiledNotes]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredMaterials = folderMaterials.filter((item) => {
    if (filter === 'NOTES') {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [item.title, item.description, item.file_name, item.type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const filteredNotes = folderNotes.filter((item) => {
    if (filter === 'MATERIALS') {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return [item.title, item.content]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const resultCount = filteredMaterials.length + filteredNotes.length;

  const renderSidebar = () => (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: palette.surface,

          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.sidebarHeader}>
        <View
          style={[
            styles.sidebarIcon,
            {
              backgroundColor: palette.accentSoft,
            },
          ]}
        >
          <Ionicons color={palette.accentStrong} name="folder-open-outline" size={18} />
        </View>

        <View style={styles.sidebarHeaderCopy}>
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

          <Text
            style={[
              styles.sidebarCaption,
              {
                color: palette.textMuted,
              },
            ]}
          >
            {subjects.data?.length ?? 0} subjects
          </Text>
        </View>
      </View>

      <Pressable
        onPress={closeFolder}
        style={[
          styles.sidebarRow,
          {
            backgroundColor: !selectedSubjectId ? palette.accentSoft : 'transparent',
          },
        ]}
      >
        <Ionicons
          color={!selectedSubjectId ? palette.accentStrong : palette.textMuted}
          name="grid-outline"
          size={17}
        />

        <Text
          numberOfLines={1}
          style={[
            styles.sidebarRowText,
            {
              color: !selectedSubjectId ? palette.accentStrong : palette.text,
            },
          ]}
        >
          Overview
        </Text>
      </Pressable>

      <Pressable
        onPress={() => openFolder(UNFILED_ID)}
        style={[
          styles.sidebarRow,
          {
            backgroundColor: selectedSubjectId === UNFILED_ID ? palette.accentSoft : 'transparent',
          },
        ]}
      >
        <View style={[styles.folderDot, { backgroundColor: palette.textMuted }]} />

        <Text
          numberOfLines={1}
          style={[
            styles.sidebarRowText,
            {
              color: selectedSubjectId === UNFILED_ID ? palette.accentStrong : palette.text,
            },
          ]}
        >
          Unfiled
        </Text>

        <Text style={[styles.sidebarCount, { color: palette.textMuted }]}>
          {unfiledMaterials.length + unfiledNotes.length}
        </Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.sidebarFolders}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {subjects.data?.map((subject) => {
          const active = selectedSubjectId === subject.id;

          const counts = getFolderCounts(subject.id);

          return (
            <Pressable
              key={subject.id}
              onPress={() => openFolder(subject.id)}
              style={[
                styles.sidebarRow,
                {
                  backgroundColor: active ? palette.accentSoft : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  styles.folderDot,
                  {
                    backgroundColor: subject.color ?? palette.accent,
                  },
                ]}
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.sidebarRowText,
                  {
                    color: active ? palette.accentStrong : palette.text,
                  },
                ]}
              >
                {subject.name}
              </Text>

              <Text
                style={[
                  styles.sidebarCount,
                  {
                    color: palette.textMuted,
                  },
                ]}
              >
                {counts.total}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/subjects')}
        style={[
          styles.manageFolders,
          {
            borderTopColor: palette.border,
          },
        ]}
      >
        <Ionicons color={palette.textMuted} name="settings-outline" size={15} />

        <Text
          style={[
            styles.manageFoldersText,
            {
              color: palette.textMuted,
            },
          ]}
        >
          Manage subjects
        </Text>
      </Pressable>
    </View>
  );

  const renderMobileFolders = () => (
    <ScrollView
      contentContainerStyle={styles.mobileFolders}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <Pressable
        onPress={closeFolder}
        style={[
          styles.mobileFolderChip,

          compact && styles.mobileFolderChipCompact,

          {
            backgroundColor: !selectedSubjectId ? palette.accentSoft : palette.surface,

            borderColor: !selectedSubjectId ? palette.accent : palette.border,
          },
        ]}
      >
        <Ionicons
          color={!selectedSubjectId ? palette.accentStrong : palette.textMuted}
          name="grid-outline"
          size={15}
        />

        <Text
          style={[
            styles.mobileFolderText,
            {
              color: !selectedSubjectId ? palette.accentStrong : palette.text,
            },
          ]}
        >
          Overview
        </Text>
      </Pressable>

      <Pressable
        onPress={() => openFolder(UNFILED_ID)}
        style={[
          styles.mobileFolderChip,

          compact && styles.mobileFolderChipCompact,

          {
            backgroundColor:
              selectedSubjectId === UNFILED_ID ? palette.accentSoft : palette.surface,

            borderColor: selectedSubjectId === UNFILED_ID ? palette.accent : palette.border,
          },
        ]}
      >
        <View style={[styles.folderDot, { backgroundColor: palette.textMuted }]} />

        <Text
          style={[
            styles.mobileFolderText,
            {
              color: selectedSubjectId === UNFILED_ID ? palette.accentStrong : palette.text,
            },
          ]}
        >
          Unfiled
        </Text>

        <Text style={[styles.mobileFolderCount, { color: palette.textMuted }]}>
          {unfiledMaterials.length + unfiledNotes.length}
        </Text>
      </Pressable>

      {subjects.data?.map((subject) => {
        const active = selectedSubjectId === subject.id;

        const counts = getFolderCounts(subject.id);

        return (
          <Pressable
            key={subject.id}
            onPress={() => openFolder(subject.id)}
            style={[
              styles.mobileFolderChip,

              compact && styles.mobileFolderChipCompact,

              {
                backgroundColor: active ? palette.accentSoft : palette.surface,

                borderColor: active ? palette.accent : palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.folderDot,
                {
                  backgroundColor: subject.color ?? palette.accent,
                },
              ]}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.mobileFolderText,
                {
                  color: active ? palette.accentStrong : palette.text,
                },
              ]}
            >
              {subject.name}
            </Text>

            <Text
              style={[
                styles.mobileFolderCount,
                {
                  color: palette.textMuted,
                },
              ]}
            >
              {counts.total}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderOverview = () => {
    const sortedSubjects = [...(subjects.data ?? [])].sort(
      (a, b) => getFolderCounts(b.id).total - getFolderCounts(a.id).total,
    );

    return (
      <View style={styles.overview}>
        {/* QUICK ACTIONS */}

        <View style={styles.quickActions}>
          <AppButton
            icon="folder-outline"
            label="Add folder"
            onPress={() => router.push('/subjects/create')}
            variant="secondary"
          />

          <AppButton
            icon="document-text-outline"
            label="Quick note"
            onPress={() => router.push('/notes/create')}
            variant="primary"
          />
        </View>

        {/* YOUR FOLDERS */}

        <SectionTitle color={palette.text} title="Your folders" />

        <View style={styles.folderGrid}>
          <Pressable
            onPress={() => openFolder(UNFILED_ID)}
            style={({ pressed }) => [
              styles.folderTile,
              splitLandscape && styles.folderTileLandscape,
              compact && styles.folderTileCompact,
              phone && styles.folderTilePhone,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <FolderIcon pack={folderPack} seed="unfiled" size={compact ? 62 : 76} />

            <Text numberOfLines={1} style={[styles.folderTileTitle, { color: palette.text }]}>
              Unfiled
            </Text>

            <Text style={[styles.folderTileMeta, { color: palette.textMuted }]}>
              {unfiledMaterials.length + unfiledNotes.length} items
            </Text>
          </Pressable>

          {sortedSubjects.map((subject) => {
            const counts = getFolderCounts(subject.id);

            return (
              <Pressable
                key={subject.id}
                onPress={() => openFolder(subject.id)}
                style={({ pressed }) => [
                  styles.folderTile,
                  splitLandscape && styles.folderTileLandscape,
                  compact && styles.folderTileCompact,
                  phone && styles.folderTilePhone,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <FolderIcon
                  pack={folderPack}
                  seed={subject.id}
                  size={compact ? 62 : 76}
                  skinUrl={
                    subject.folder_skin_url ? getFolderSkinUrl(subject.folder_skin_url) : null
                  }
                />

                <Text numberOfLines={1} style={[styles.folderTileTitle, { color: palette.text }]}>
                  {subject.name}
                </Text>

                <Text style={[styles.folderTileMeta, { color: palette.textMuted }]}>
                  {counts.total} items
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!subjects.data?.length ? (
          <FeedbackState
            message="Create subjects first and each subject will get its own study folder."
            title="No folders yet"
          />
        ) : null}
      </View>
    );
  };

  const renderFolder = () => (
    <View style={styles.folderView}>
      {/* FOLDER HEADER */}

      <View style={[styles.folderHeader, compact && styles.folderHeaderCompact]}>
        {!splitLandscape ? (
          <Pressable
            accessibilityLabel="Back to study overview"
            onPress={closeFolder}
            style={[
              styles.backButton,
              {
                backgroundColor: palette.surface,

                borderColor: palette.border,
              },
            ]}
          >
            <Ionicons color={palette.text} name="arrow-back" size={18} />
          </Pressable>
        ) : null}

        <View
          style={[
            styles.bigFolderIcon,
            {
              backgroundColor: palette.accentSoft,
            },
          ]}
        >
          <Ionicons
            color={selectedSubject?.color ?? palette.accentStrong}
            name="folder-open-outline"
            size={compact ? 22 : 26}
          />
        </View>

        <View style={styles.folderHeaderCopy}>
          <Text
            numberOfLines={2}
            style={[
              styles.folderTitle,

              compact && styles.folderTitleCompact,

              {
                color: palette.text,
              },
            ]}
          >
            {selectedSubjectId === UNFILED_ID ? 'Unfiled' : (selectedSubject?.name ?? 'Subject')}
          </Text>

          <Text
            style={[
              styles.folderSubtitle,
              {
                color: palette.textMuted,
              },
            ]}
          >
            {folderMaterials.length} materials · {folderNotes.length} notes
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/materials/create')}
          style={[
            styles.addHeaderButton,
            {
              backgroundColor: palette.accentSolid,
            },
          ]}
        >
          <Ionicons color="#FFFFFF" name="add" size={18} />

          {!phone ? <Text style={styles.addHeaderText}>Add</Text> : null}
        </Pressable>
      </View>

      {/* SEARCH */}

      <View
        style={[
          styles.searchBox,

          compact && styles.searchBoxCompact,

          {
            backgroundColor: palette.surface,

            borderColor: palette.border,
          },
        ]}
      >
        <Ionicons color={palette.textMuted} name="search-outline" size={17} />

        <TextInput
          onChangeText={setSearch}
          placeholder="Search this folder"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={[
            styles.searchInput,
            {
              color: palette.text,
            },
          ]}
          value={search}
        />

        {search ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')}>
            <Ionicons color={palette.textMuted} name="close-circle" size={17} />
          </Pressable>
        ) : null}
      </View>

      {/* FILTERS */}

      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {(
          [
            {
              label: 'All',
              value: 'ALL',
            },

            {
              label: 'Materials',
              value: 'MATERIALS',
            },

            {
              label: 'Notes',
              value: 'NOTES',
            },
          ] as {
            label: string;

            value: LibraryFilter;
          }[]
        ).map((option) => {
          const active = filter === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: active ? palette.accentSoft : palette.surface,

                  borderColor: active ? palette.accent : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: active ? palette.accentStrong : palette.textMuted,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* FILE GRID */}

      {resultCount ? (
        <View style={styles.fileGrid}>
          {filteredMaterials.map((item) => {
            const progress =
              item.type === 'PDF' && item.page_count
                ? pdfReadingProgress(item.last_read_page, item.page_count)
                : null;

            return (
              <View
                key={item.id}
                style={[
                  styles.fileTile,

                  splitLandscape && styles.fileTileLandscape,

                  compact && styles.fileTileCompact,

                  phone && styles.fileTilePhone,

                  {
                    backgroundColor: palette.surface,

                    borderColor: palette.border,
                  },
                ]}
              >
                <Pressable onPress={() => openMaterial(item)} style={styles.fileMain}>
                  <View
                    style={[
                      styles.filePreview,

                      compact && styles.filePreviewCompact,

                      {
                        backgroundColor:
                          item.type === 'PDF' ? palette.accentSoft : palette.lavenderSoft,
                      },
                    ]}
                  >
                    <Ionicons
                      color={item.type === 'PDF' ? palette.accentStrong : palette.lavender}
                      name={item.type === 'PDF' ? 'document-text-outline' : 'link-outline'}
                      size={compact ? 25 : 30}
                    />

                    {progress !== null ? (
                      <View
                        style={[
                          styles.progressBadge,
                          {
                            backgroundColor: palette.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.progressBadgeText,
                            {
                              color: palette.accentStrong,
                            },
                          ]}
                        >
                          {progress}%
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.fileCopy}>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.fileTitle,
                        {
                          color: palette.text,
                        },
                      ]}
                    >
                      {item.title}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.fileMeta,
                        {
                          color: palette.textMuted,
                        },
                      ]}
                    >
                      {item.type === 'PDF'
                        ? item.page_count
                          ? `${item.page_count} pages`
                          : 'PDF'
                        : item.type}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  accessibilityLabel={`Delete ${item.title}`}
                  disabled={removeMaterial.isPending}
                  onPress={() => confirmDeleteMaterial(item)}
                  style={styles.tileDelete}
                >
                  <Ionicons color={palette.danger} name="trash-outline" size={15} />
                </Pressable>
              </View>
            );
          })}

          {filteredNotes.map((item) => (
            <View
              key={item.id}
              style={[
                styles.fileTile,

                splitLandscape && styles.fileTileLandscape,

                compact && styles.fileTileCompact,

                phone && styles.fileTilePhone,

                {
                  backgroundColor: palette.surface,

                  borderColor: palette.border,
                },
              ]}
            >
              <Pressable onPress={() => openNote(item)} style={styles.fileMain}>
                <View
                  style={[
                    styles.filePreview,

                    compact && styles.filePreviewCompact,

                    {
                      backgroundColor: palette.lavenderSoft,
                    },
                  ]}
                >
                  <Ionicons
                    color={palette.lavender}
                    name="create-outline"
                    size={compact ? 25 : 30}
                  />

                  {item.page_number ? (
                    <View
                      style={[
                        styles.progressBadge,
                        {
                          backgroundColor: palette.surface,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.progressBadgeText,
                          {
                            color: palette.accentStrong,
                          },
                        ]}
                      >
                        P.
                        {item.page_number}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.fileCopy}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.fileTitle,
                      {
                        color: palette.text,
                      },
                    ]}
                  >
                    {item.title ?? `Page ${item.page_number ?? '—'} note`}
                  </Text>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.fileMeta,
                      {
                        color: palette.textMuted,
                      },
                    ]}
                  >
                    Note · {format(new Date(item.updated_at), 'MMM d')}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                accessibilityLabel="Delete note"
                disabled={removeNote.isPending}
                onPress={() => confirmDeleteNote(item)}
                style={styles.tileDelete}
              >
                <Ionicons color={palette.danger} name="trash-outline" size={15} />
              </Pressable>
            </View>
          ))}

          {/* CREATE TILE */}

          <Pressable
            onPress={() => router.push('/materials/create')}
            style={({ pressed }) => [
              styles.createTile,

              splitLandscape && styles.fileTileLandscape,

              compact && styles.fileTileCompact,

              phone && styles.fileTilePhone,

              {
                backgroundColor: palette.surfaceAlt,

                borderColor: palette.border,

                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.createIcon,
                {
                  backgroundColor: palette.accentSoft,
                },
              ]}
            >
              <Ionicons color={palette.accentStrong} name="add" size={22} />
            </View>

            <Text
              style={[
                styles.createTitle,
                {
                  color: palette.text,
                },
              ]}
            >
              Add material
            </Text>

            <Text
              style={[
                styles.createCaption,
                {
                  color: palette.textMuted,
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

            compact && styles.emptyFolderCompact,

            {
              backgroundColor: palette.surface,

              borderColor: palette.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyFolderIcon,

              compact && styles.emptyFolderIconCompact,

              {
                backgroundColor: palette.accentSoft,
              },
            ]}
          >
            <Ionicons color={palette.text} name="folder-outline" size={compact ? 20 : 23} />
          </View>

          <Text
            style={[
              styles.emptyFolderTitle,

              compact && styles.emptyFolderTitleCompact,

              {
                color: palette.text,
              },
            ]}
          >
            {normalizedSearch ? 'No matching files' : 'This folder is empty'}
          </Text>

          <Text
            style={[
              styles.emptyFolderDescription,

              compact && styles.emptyFolderDescriptionCompact,

              {
                color: palette.textMuted,
              },
            ]}
          >
            {normalizedSearch
              ? 'Try another search or filter.'
              : 'Add a PDF, material or note to this folder.'}
          </Text>

          {!normalizedSearch ? (
            <Pressable
              onPress={() => router.push('/materials/create')}
              style={[
                styles.emptyAdd,

                compact && styles.emptyAddCompact,

                {
                  backgroundColor: palette.accentSoft,
                },
              ]}
            >
              <Ionicons color={palette.accentStrong} name="add" size={14} />

              <Text
                style={[
                  styles.emptyAddText,
                  {
                    color: palette.accentStrong,
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
      description="Your materials, notes and study sessions in one place."
      empty={false}
      emptyMessage=""
      error={materials.error ?? notes.error ?? sessions.error ?? subjects.error}
      headerActions={
        <Pressable
          accessibilityLabel="Settings"
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.settingsButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
        >
          <Ionicons color={palette.accentStrong} name="settings-outline" size={19} />
        </Pressable>
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
      {/*
       * The folder grid on Overview already lets you jump into a
       * subject (with counts and color, which these chips don't
       * show). Once inside a folder, the grid is gone, so the
       * chips take over as the compact way to switch to another one.
       */}
      {!splitLandscape && selectedSubjectId ? renderMobileFolders() : null}

      <View style={[styles.shell, splitLandscape && styles.shellLandscape]}>
        {splitLandscape ? renderSidebar() : null}

        <View style={styles.main}>{selectedSubjectId ? renderFolder() : renderOverview()}</View>
      </View>
    </EntityList>
  );
}

function SectionTitle({ color, title }: { color: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
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
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    marginTop: 3,
    width: 42,
  },

  shell: {
    width: '100%',
  },

  shellLandscape: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 18,
  },

  main: {
    flex: 1,
    minWidth: 0,
  },

  /*
   * LANDSCAPE SIDEBAR
   */

  sidebar: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: 680,
    minWidth: 220,
    overflow: 'hidden',
    width: 230,
  },

  sidebarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    padding: 14,
  },

  sidebarIcon: {
    alignItems: 'center',
    borderRadius: 11,
    height: 35,
    justifyContent: 'center',
    width: 35,
  },

  sidebarHeaderCopy: {
    flex: 1,
    gap: 1,
  },

  sidebarTitle: {
    ...typography.sectionTitle,
    fontSize: 15,
    lineHeight: 19,
  },

  sidebarCaption: {
    ...typography.caption,
    fontSize: 9,
  },

  sidebarFolders: {
    gap: 3,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },

  sidebarRow: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },

  sidebarRowText: {
    ...typography.body,
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },

  sidebarCount: {
    ...typography.caption,
    fontSize: 8,
    fontWeight: '700',
  },

  folderDot: {
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },

  manageFolders: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 14,
  },

  manageFoldersText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
  },

  /*
   * PORTRAIT FOLDERS
   */

  mobileFolders: {
    gap: 7,
    paddingBottom: 10,
  },

  mobileFolderChip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    height: 39,
    maxWidth: 190,
    paddingHorizontal: 12,
  },

  mobileFolderChipCompact: {
    gap: 5,
    height: 34,
    maxWidth: 155,
    paddingHorizontal: 9,
  },

  mobileFolderText: {
    ...typography.caption,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
  },

  mobileFolderCount: {
    ...typography.caption,
    fontSize: 8,
    fontWeight: '700',
  },

  /*
   * OVERVIEW
   */

  overview: {
    gap: 12,
    width: '100%',
  },

  quickActions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },

  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 7,
  },

  section: {
    ...typography.sectionTitle,
    fontSize: 17,
    lineHeight: 22,
  },

  sectionRule: {
    flex: 1,
    height: 1,
    marginLeft: 3,
    opacity: 0.13,
  },

  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  folderTile: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    width: '21%',
  },

  folderTileLandscape: {
    width: '14%',
  },

  folderTileCompact: {
    width: '29%',
  },

  folderTilePhone: {
    width: '46%',
  },

  folderTileTitle: {
    ...typography.label,
    fontSize: 12,
    textAlign: 'center',
  },

  folderTileMeta: {
    ...typography.caption,
    fontSize: 9,
    textAlign: 'center',
  },

  /*
   * FOLDER VIEW
   */

  folderView: {
    gap: 12,
    width: '100%',
  },

  folderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 4,
  },

  folderHeaderCompact: {
    gap: 8,
  },

  backButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },

  bigFolderIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },

  folderHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },

  folderTitle: {
    ...typography.sectionTitle,
    fontSize: 22,
    lineHeight: 28,
  },

  folderTitleCompact: {
    fontSize: 18,
    lineHeight: 23,
  },

  folderSubtitle: {
    ...typography.caption,
    fontSize: 9,
  },

  addHeaderButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 13,
  },

  addHeaderText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  searchBox: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 43,
    paddingHorizontal: 12,
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
    fontSize: 12,
    lineHeight: 18,
    minWidth: 0,
    paddingVertical: 8,
  },

  filters: {
    gap: 7,
  },

  filterButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 11,
  },

  filterText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
  },

  /*
   * FILE GRID
   */

  fileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },

  fileTile: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '48.5%',
  },

  fileTileLandscape: {
    width: '31.5%',
  },

  fileTileCompact: {
    borderRadius: 12,
    width: '48%',
  },

  fileTilePhone: {
    width: '100%',
  },

  fileMain: {
    width: '100%',
  },

  filePreview: {
    alignItems: 'center',
    height: 105,
    justifyContent: 'center',
    position: 'relative',
  },

  filePreviewCompact: {
    height: 82,
  },

  progressBadge: {
    borderRadius: radii.pill,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: 'absolute',
    right: 8,
  },

  progressBadgeText: {
    ...typography.label,
    fontSize: 7,
  },

  fileCopy: {
    gap: 3,
    padding: 10,
    paddingRight: 37,
  },

  fileTitle: {
    ...typography.body,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },

  fileMeta: {
    ...typography.caption,
    fontSize: 8,
    lineHeight: 11,
  },

  tileDelete: {
    alignItems: 'center',
    bottom: 8,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 7,
    width: 28,
  },

  createTile: {
    alignItems: 'center',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 160,
    padding: 14,
    width: '48.5%',
  },

  createIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },

  createTitle: {
    ...typography.body,
    fontSize: 11,
    fontWeight: '700',
  },

  createCaption: {
    ...typography.caption,
    fontSize: 8,
    textAlign: 'center',
  },

  /*
   * EMPTY FOLDER
   */

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
