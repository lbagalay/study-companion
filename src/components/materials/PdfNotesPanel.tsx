import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useRef,
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
  View,
} from 'react-native';

import {
  radii,
  spacing,
  typography,
} from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { keys } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';

import {
  deleteRecord,
  listPdfNotes,
  saveNote,
} from '@/services';

import type {
  StudyMaterial,
} from '@/types/database';

/* ============================================================
 * TYPES
 * ============================================================
 */

type PdfNote = NonNullable<
  Awaited<
    ReturnType<typeof saveNote>
  >
>;

type SavePayload = {
  content: string;
  id?: string;
  pageNumber: number;
  title: string;
};

/* ============================================================
 * HELPERS
 * ============================================================
 */

function noteSignature(
  title: string,
  content: string,
  pageNumber: number,
) {
  return JSON.stringify({
    content,
    pageNumber,
    title,
  });
}

/* ============================================================
 * COMPONENT
 * ============================================================
 */

export function PdfNotesPanel({
  currentPage,
  material,
  onJumpToPage,
  pageCount,
}: {
  currentPage: number;
  material: StudyMaterial;

  onJumpToPage: (
    page: number,
  ) => void;

  pageCount: number;
}) {
  const palette =
    useAppTheme();

  const queryClient =
    useQueryClient();

  const queryKey = [
    'pdf-notes',
    material.id,
  ] as const;

  /* ==========================================================
   * QUERY
   * ==========================================================
   */

  const notes =
    useQuery({
      queryKey,

      queryFn: async () => {
        const result =
          await listPdfNotes(
            material.id,
          );

        return result.filter(
          (
            item,
          ): item is PdfNote =>
            item !== null &&
            item !== undefined,
        );
      },

      staleTime:
        60_000,
    });

  /* ==========================================================
   * LOCAL EDITOR STATE
   *
   * Typing stays local.
   * Supabase is not called on every keypress.
   * ==========================================================
   */

  const [
    selectedNoteId,
    setSelectedNoteId,
  ] =
    useState<
      string | null
    >(null);

  const [
    title,
    setTitle,
  ] =
    useState('');

  const [
    content,
    setContent,
  ] =
    useState('');

  const [
    notePage,
    setNotePage,
  ] =
    useState(
      currentPage,
    );

  const editorValuesRef =
    useRef({
      content,
      notePage,
      title,
    });

  useEffect(() => {
    editorValuesRef.current = {
      content,
      notePage,
      title,
    };
  }, [
    content,
    notePage,
    title,
  ]);

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState<
      string | null
    >(null);

  const lastSavedSignatureRef =
    useRef('');

  const autosaveTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /* ==========================================================
   * SELECTED NOTE
   * ==========================================================
   */

  const selectedNote =
    useMemo(
      () =>
        notes.data?.find(
          (
            item,
          ) =>
            item.id ===
            selectedNoteId,
        ),

      [
        notes.data,
        selectedNoteId,
      ],
    );

  /* ==========================================================
   * AUTOSAVE TIMER
   * ==========================================================
   */

  const clearAutosave =
    () => {
      if (
        autosaveTimerRef.current
      ) {
        clearTimeout(
          autosaveTimerRef.current,
        );

        autosaveTimerRef.current =
          null;
      }
    };

  /* ==========================================================
   * RESET / NEW NOTE
   * ==========================================================
   */

  const resetComposer = (
    page =
      currentPage,
  ) => {
    clearAutosave();

    setSelectedNoteId(
      null,
    );

    setTitle('');

    setContent('');

    setNotePage(
      Math.max(
        1,

        Math.min(
          pageCount,
          page,
        ),
      ),
    );

    setSaveMessage(
      null,
    );

    lastSavedSignatureRef.current =
      '';
  };

  /* ==========================================================
   * OPEN EXISTING NOTE
   * ==========================================================
   */

  const openNote = (
    item: PdfNote,
  ) => {
    clearAutosave();

    const page =
      item.page_number ??
      currentPage;

    const nextTitle =
      item.title ??
      '';

    const nextContent =
      item.content ??
      '';

    setSelectedNoteId(
      item.id,
    );

    setTitle(
      nextTitle,
    );

    setContent(
      nextContent,
    );

    setNotePage(
      page,
    );

    lastSavedSignatureRef.current =
      noteSignature(
        nextTitle,
        nextContent,
        page,
      );

    setSaveMessage(
      null,
    );
  };

  /* ==========================================================
   * KEEP NEW NOTE ATTACHED TO CURRENT PDF PAGE
   * ==========================================================
   */

  useEffect(() => {
    if (
      selectedNoteId
    ) {
      return;
    }

    if (
      title.trim() ||
      content.trim()
    ) {
      return;
    }

    const syncTimer =
      setTimeout(() => {
        setNotePage(
          currentPage,
        );
      }, 0);

    return () => {
      clearTimeout(
        syncTimer,
      );
    };
  }, [
    content,
    currentPage,
    selectedNoteId,
    title,
  ]);

  /* ==========================================================
   * SAVE NOTE
   * ==========================================================
   */

  const saveMutation =
    useMutation<
      PdfNote,
      Error,
      SavePayload
    >({
      mutationFn:
        async (
          payload,
        ) => {
          const saved =
            await saveNote(
              {
                content:
                  payload.content,

                favorite:
                  selectedNote
                    ?.favorite ??
                  false,

                material_id:
                  material.id,

                page_number:
                  payload.pageNumber,

                subject_id:
                  material.subject_id,

                title:
                  payload.title.trim()
                    ? payload.title.trim()
                    : `Page ${payload.pageNumber} note`,
              },

              payload.id,
            );

          /*
           * Supabase .single() can still be
           * typed as possibly null.
           *
           * From this point forward PdfNote
           * is guaranteed to be non-null.
           */
          if (!saved) {
            throw new Error(
              'The note was saved but no note record was returned.',
            );
          }

          return saved;
        },

      onMutate: () => {
        setSaveMessage(
          'Saving…',
        );
      },

      onSuccess:
        (
          saved,
          payload,
        ) => {
          /*
           * Update the local PDF notes cache
           * directly.
           *
           * No full refetch = smoother editor.
           */
          queryClient.setQueryData<
            PdfNote[]
          >(
            queryKey,

            (
              current,
            ) => {
              const existing =
                current ??
                [];

              const alreadyExists =
                existing.some(
                  (
                    item,
                  ) =>
                    item.id ===
                    saved.id,
                );

              if (
                alreadyExists
              ) {
                return existing.map(
                  (
                    item,
                  ) =>
                    item.id ===
                    saved.id
                      ? saved
                      : item,
                );
              }

              return [
                saved,
                ...existing,
              ];
            },
          );

          /*
           * Refresh the normal Notes screen
           * later without blocking typing.
           */
          void queryClient.invalidateQueries({
            queryKey:
              keys.notes,
          });

          const savedPage =
            saved.page_number ??
            payload.pageNumber;

          const savedSignature =
            noteSignature(
              payload.title,
              payload.content,
              savedPage,
            );

          setSelectedNoteId(
            saved.id,
          );

          if (!payload.id) {
            setNotePage(
              savedPage,
            );
          }

          lastSavedSignatureRef.current =
            savedSignature;

          const editorValues =
            editorValuesRef.current;

          const editorSignature =
            noteSignature(
              editorValues.title,
              editorValues.content,
              editorValues.notePage,
            );

          setSaveMessage(
            editorSignature ===
              savedSignature
              ? 'Saved'
              : 'Changes pending…',
          );
        },

      onError:
        (
          error,
        ) => {
          setSaveMessage(
            getErrorMessage(
              error,
            ),
          );
        },
    });

  /* ==========================================================
   * MANUAL SAVE
   * ==========================================================
   */

  const saveCurrent =
    () => {
      const trimmedContent =
        content.trim();

      const trimmedTitle =
        title.trim();

      if (
        !trimmedContent &&
        !trimmedTitle
      ) {
        return;
      }

      const safePage =
        Math.max(
          1,

          Math.min(
            pageCount,
            notePage,
          ),
        );

      const signature =
        noteSignature(
          title,
          content,
          safePage,
        );

      /*
       * Nothing changed.
       */
      if (
        selectedNoteId &&
        signature ===
          lastSavedSignatureRef.current
      ) {
        setSaveMessage(
          'Saved',
        );

        return;
      }

      clearAutosave();

      saveMutation.mutate({
        content,

        id:
          selectedNoteId ??
          undefined,

        pageNumber:
          safePage,

        title,
      });
    };

  /* ==========================================================
   * DEBOUNCED AUTOSAVE
   *
   * FIXES NOTES LAG
   *
   * Existing notes:
   * save 900ms after typing stops.
   *
   * New notes:
   * user presses Save once.
   *
   * No Supabase call on every character.
   * ==========================================================
   */

  useEffect(() => {
    if (
      !selectedNoteId
    ) {
      return;
    }

    const signature =
      noteSignature(
        title,
        content,
        notePage,
      );

    if (
      signature ===
      lastSavedSignatureRef.current
    ) {
      return;
    }

    clearAutosave();

    autosaveTimerRef.current =
      setTimeout(
        () => {
          if (
            !title.trim() &&
            !content.trim()
          ) {
            return;
          }

          saveMutation.mutate({
            content,

            id:
              selectedNoteId,

            pageNumber:
              notePage,

            title,
          });
        },

        900,
      );

    return () => {
      clearAutosave();
    };

    /*
     * We intentionally trigger only from
     * editor values.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    content,
    notePage,
    selectedNoteId,
    title,
  ]);

  /* ==========================================================
   * CLEANUP
   * ==========================================================
   */

  useEffect(
    () => {
      return () => {
        clearAutosave();
      };
    },
    [],
  );

  /* ==========================================================
   * DELETE NOTE
   * ==========================================================
   */

  const deleteMutation =
    useMutation({
      mutationFn:
        (
          id: string,
        ) =>
          deleteRecord(
            'notes',
            id,
          ),

      onSuccess:
        async (
          _,
          id,
        ) => {
          queryClient.setQueryData<
            PdfNote[]
          >(
            queryKey,

            (
              current,
            ) =>
              current?.filter(
                (
                  item,
                ) =>
                  item.id !==
                  id,
              ) ??
              [],
          );

          if (
            selectedNoteId ===
            id
          ) {
            resetComposer(
              currentPage,
            );
          }

          await queryClient.invalidateQueries({
            queryKey:
              keys.notes,
          });
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

  /* ==========================================================
   * CONFIRM DELETE
   * ==========================================================
   */

  const confirmDelete = (
    item: PdfNote,
  ) => {
    const noteTitle =
      item.title ??
      `Page ${
        item.page_number ??
        '—'
      } note`;

    const message =
      `Delete "${noteTitle}"? This cannot be undone.`;

    const performDelete =
      () => {
        clearAutosave();

        deleteMutation.mutate(
          item.id,
        );
      };

    if (
      Platform.OS ===
        'web' &&
      typeof window !==
        'undefined'
    ) {
      const confirmed =
        window.confirm(
          message,
        );

      if (
        confirmed
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

  /* ==========================================================
   * PAGE STEPPER
   * ==========================================================
   */

  const updateNotePage = (
    change: number,
  ) => {
    setNotePage(
      (
        current,
      ) =>
        Math.max(
          1,

          Math.min(
            pageCount,
            current +
              change,
          ),
        ),
    );
  };

  /* ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <View
      style={[
        styles.panel,

        {
          backgroundColor:
            palette.surface,

          borderColor:
            palette.border,
        },
      ]}
    >
      {/* ====================================================
       * HEADER
       * ====================================================
       */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerCopy
          }
        >
          <View
            style={
              styles.titleRow
            }
          >
            <View
              style={[
                styles.headerIcon,

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
                name="document-text-outline"
                size={
                  18
                }
              />
            </View>

            <Text
              style={[
                styles.heading,

                {
                  color:
                    palette.text,
                },
              ]}
            >
              PDF Notes
            </Text>
          </View>

          <Text
            style={[
              styles.description,

              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            Keep notes beside the page you are studying.
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Create new PDF note"
          accessibilityRole="button"
          onPress={() =>
            resetComposer(
              currentPage,
            )
          }
          style={({
            pressed,
          }) => [
            styles.newButton,

            {
              backgroundColor:
                palette.accentSoft,

              opacity:
                pressed
                  ? 0.68
                  : 1,
            },
          ]}
        >
          <Ionicons
            color={
              palette.accentStrong
            }
            name="add"
            size={
              17
            }
          />

          <Text
            style={[
              styles.newButtonText,

              {
                color:
                  palette.accentStrong,
              },
            ]}
          >
            New
          </Text>
        </Pressable>
      </View>

      {/* ====================================================
       * NOTE COMPOSER
       * ====================================================
       */}

      <View
        style={[
          styles.composer,

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
            styles.composerTop
          }
        >
          <View
            style={
              styles.pageControl
            }
          >
            <Text
              style={[
                styles.pageLabel,

                {
                  color:
                    palette.textMuted,
                },
              ]}
            >
              PAGE
            </Text>

            <View
              style={[
                styles.pageStepper,

                {
                  backgroundColor:
                    palette.surface,

                  borderColor:
                    palette.border,
                },
              ]}
            >
              <Pressable
                accessibilityLabel="Previous page"
                disabled={
                  notePage <=
                  1
                }
                onPress={() =>
                  updateNotePage(
                    -1,
                  )
                }
                style={{
                  opacity:
                    notePage <=
                    1
                      ? 0.3
                      : 1,
                }}
              >
                <Ionicons
                  color={
                    palette.text
                  }
                  name="remove"
                  size={
                    16
                  }
                />
              </Pressable>

              <Pressable
                accessibilityLabel={`Go to page ${notePage}`}
                onPress={() =>
                  onJumpToPage(
                    notePage,
                  )
                }
              >
                <Text
                  style={[
                    styles.pageNumber,

                    {
                      color:
                        palette.text,
                    },
                  ]}
                >
                  {notePage}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Next page"
                disabled={
                  notePage >=
                  pageCount
                }
                onPress={() =>
                  updateNotePage(
                    1,
                  )
                }
                style={{
                  opacity:
                    notePage >=
                    pageCount
                      ? 0.3
                      : 1,
                }}
              >
                <Ionicons
                  color={
                    palette.text
                  }
                  name="add"
                  size={
                    16
                  }
                />
              </Pressable>
            </View>
          </View>

          {selectedNoteId ? (
            <View
              style={[
                styles.editingBadge,

                {
                  backgroundColor:
                    palette.accentSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.editingText,

                  {
                    color:
                      palette.accentStrong,
                  },
                ]}
              >
                EDITING
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.editingBadge,

                {
                  backgroundColor:
                    palette.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.editingText,

                  {
                    color:
                      palette.textMuted,
                  },
                ]}
              >
                NEW NOTE
              </Text>
            </View>
          )}
        </View>

        {/* TITLE */}

        <TextInput
          onChangeText={
            setTitle
          }
          placeholder="Note title"
          placeholderTextColor={
            palette.textMuted
          }
          selectionColor={
            palette.accent
          }
          style={[
            styles.titleInput,

            {
              backgroundColor:
                palette.surface,

              borderColor:
                palette.border,

              color:
                palette.text,
            },
          ]}
          value={
            title
          }
        />

        {/* CONTENT */}

        <TextInput
          multiline
          onChangeText={
            setContent
          }
          placeholder="Write your note here…"
          placeholderTextColor={
            palette.textMuted
          }
          selectionColor={
            palette.accent
          }
          style={[
            styles.contentInput,

            {
              backgroundColor:
                palette.surface,

              borderColor:
                palette.border,

              color:
                palette.text,
            },
          ]}
          textAlignVertical="top"
          value={
            content
          }
        />

        {/* SAVE FOOTER */}

        <View
          style={
            styles.composerFooter
          }
        >
          <View
            style={
              styles.saveState
            }
          >
            {saveMutation.isPending ? (
              <Ionicons
                color={
                  palette.textMuted
                }
                name="cloud-upload-outline"
                size={
                  14
                }
              />
            ) : saveMessage ===
              'Saved' ? (
              <Ionicons
                color={
                  palette.success
                }
                name="checkmark-circle-outline"
                size={
                  14
                }
              />
            ) : null}

            <Text
              numberOfLines={
                2
              }
              style={[
                styles.saveStateText,

                {
                  color:
                    saveMessage ===
                    'Saved'
                      ? palette.success
                      : palette.textMuted,
                },
              ]}
            >
              {saveMutation.isPending
                ? 'Saving…'
                : saveMessage ??
                  (selectedNoteId
                    ? 'Autosaves after typing'
                    : 'Press Save when ready')}
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Save note"
            accessibilityRole="button"
            disabled={
              saveMutation.isPending ||
              (!title.trim() &&
                !content.trim())
            }
            onPress={
              saveCurrent
            }
            style={({
              pressed,
            }) => [
              styles.saveButton,

              {
                backgroundColor:
                  palette.accentSolid,

                opacity:
                  saveMutation.isPending ||
                  (!title.trim() &&
                    !content.trim())
                    ? 0.4
                    : pressed
                      ? 0.74
                      : 1,
              },
            ]}
          >
            <Ionicons
              color="#FFFFFF"
              name="checkmark"
              size={
                16
              }
            />

            <Text
              style={
                styles.saveButtonText
              }
            >
              Save
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ====================================================
       * SAVED NOTES HEADER
       * ====================================================
       */}

      <View
        style={
          styles.listHeader
        }
      >
        <Text
          style={[
            styles.listTitle,

            {
              color:
                palette.text,
            },
          ]}
        >
          Saved notes
        </Text>

        <Text
          style={[
            styles.count,

            {
              color:
                palette.textMuted,
            },
          ]}
        >
          {
            notes.data
              ?.length ??
            0
          }
        </Text>
      </View>

      {/* ====================================================
       * LOADING
       * ====================================================
       */}

      {notes.isLoading ? (
        <View
          style={
            styles.empty
          }
        >
          <Text
            style={[
              styles.emptyText,

              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            Loading notes…
          </Text>
        </View>
      ) : null}

      {/* ====================================================
       * ERROR
       * ====================================================
       */}

      {!notes.isLoading &&
      notes.error ? (
        <View
          style={
            styles.empty
          }
        >
          <Text
            style={[
              styles.emptyText,

              {
                color:
                  palette.danger,
              },
            ]}
          >
            {
              getErrorMessage(
                notes.error,
              )
            }
          </Text>

          <Pressable
            onPress={() =>
              void notes.refetch()
            }
          >
            <Text
              style={[
                styles.retry,

                {
                  color:
                    palette.accentStrong,
                },
              ]}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* ====================================================
       * EMPTY
       * ====================================================
       */}

      {!notes.isLoading &&
      !notes.error &&
      !notes.data?.length ? (
        <View
          style={
            styles.empty
          }
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
              name="document-text-outline"
              size={
                20
              }
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
            No notes yet
          </Text>

          <Text
            style={[
              styles.emptyText,

              {
                color:
                  palette.textMuted,
              },
            ]}
          >
            Add a thought while reading and it will stay linked to that page.
          </Text>
        </View>
      ) : null}

      {/* ====================================================
       * NOTES LIST
       * ====================================================
       */}

      {!notes.isLoading &&
      !notes.error &&
      Boolean(
        notes.data?.length,
      ) ? (
        <ScrollView
          contentContainerStyle={
            styles.notesList
          }
          nestedScrollEnabled
          showsVerticalScrollIndicator={
            false
          }
          style={
            styles.notesScroll
          }
        >
          {notes.data?.map(
            (
              item,
            ) => {
              const active =
                selectedNoteId ===
                item.id;

              const itemPage =
                item.page_number;

              return (
                <View
                  key={
                    item.id
                  }
                  style={[
                    styles.noteRow,

                    {
                      backgroundColor:
                        active
                          ? palette.accentSoft
                          : palette.surfaceAlt,

                      borderColor:
                        active
                          ? palette.accent
                          : palette.border,
                    },
                  ]}
                >
                  {/* NOTE CONTENT */}

                  <Pressable
                    accessibilityLabel={`Edit ${
                      item.title ??
                      'note'
                    }`}
                    accessibilityRole="button"
                    onPress={() =>
                      openNote(
                        item,
                      )
                    }
                    style={
                      styles.noteMain
                    }
                  >
                    <View
                      style={
                        styles.noteHeading
                      }
                    >
                      <Text
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.noteTitle,

                          {
                            color:
                              palette.text,
                          },
                        ]}
                      >
                        {item.title ??
                          `Page ${
                            itemPage ??
                            '—'
                          } note`}
                      </Text>

                      <View
                        style={[
                          styles.pageBadge,

                          {
                            backgroundColor:
                              palette.surface,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pageBadgeText,

                            {
                              color:
                                palette.accentStrong,
                            },
                          ]}
                        >
                          P.
                          {
                            itemPage ??
                            '—'
                          }
                        </Text>
                      </View>
                    </View>

                    {item.content ? (
                      <Text
                        numberOfLines={
                          2
                        }
                        style={[
                          styles.preview,

                          {
                            color:
                              palette.textMuted,
                          },
                        ]}
                      >
                        {
                          item.content
                        }
                      </Text>
                    ) : null}
                  </Pressable>

                  {/* ACTIONS */}

                  <View
                    style={
                      styles.noteActions
                    }
                  >
                    {itemPage ? (
                      <Pressable
                        accessibilityLabel={`Go to page ${itemPage}`}
                        accessibilityRole="button"
                        onPress={() =>
                          onJumpToPage(
                            itemPage,
                          )
                        }
                        style={[
                          styles.noteAction,

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
                          name="arrow-forward-outline"
                          size={
                            16
                          }
                        />
                      </Pressable>
                    ) : null}

                    <Pressable
                      accessibilityLabel="Delete note"
                      accessibilityRole="button"
                      disabled={
                        deleteMutation.isPending
                      }
                      onPress={() =>
                        confirmDelete(
                          item,
                        )
                      }
                      style={[
                        styles.noteAction,

                        {
                          backgroundColor:
                            palette.surface,

                          borderColor:
                            palette.border,

                          opacity:
                            deleteMutation.isPending
                              ? 0.4
                              : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        color={
                          palette.danger
                        }
                        name="trash-outline"
                        size={
                          16
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              );
            },
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

/* ============================================================
 * STYLES
 * ============================================================
 */

const styles =
  StyleSheet.create({
    panel: {
      borderRadius:
        radii.xl,

      borderWidth:
        1,

      gap:
        spacing.md,

      overflow:
        'hidden',

      padding:
        spacing.md,

      width:
        '100%',
    },

    /* HEADER */

    header: {
      alignItems:
        'flex-start',

      flexDirection:
        'row',

      gap:
        spacing.md,

      justifyContent:
        'space-between',
    },

    headerCopy: {
      flex:
        1,

      gap:
        4,

      minWidth:
        0,
    },

    titleRow: {
      alignItems:
        'center',

      flexDirection:
        'row',

      gap:
        8,
    },

    headerIcon: {
      alignItems:
        'center',

      borderRadius:
        11,

      height:
        34,

      justifyContent:
        'center',

      width:
        34,
    },

    heading: {
      ...typography.sectionTitle,

      fontSize:
        18,

      lineHeight:
        23,
    },

    description: {
      ...typography.caption,

      fontSize:
        10,

      lineHeight:
        15,
    },

    newButton: {
      alignItems:
        'center',

      borderRadius:
        radii.pill,

      flexDirection:
        'row',

      gap:
        4,

      minHeight:
        34,

      paddingHorizontal:
        11,
    },

    newButtonText: {
      ...typography.caption,

      fontSize:
        10,

      fontWeight:
        '800',
    },

    /* COMPOSER */

    composer: {
      borderRadius:
        18,

      borderWidth:
        1,

      gap:
        9,

      padding:
        12,
    },

    composerTop: {
      alignItems:
        'center',

      flexDirection:
        'row',

      gap:
        8,

      justifyContent:
        'space-between',
    },

    pageControl: {
      alignItems:
        'center',

      flexDirection:
        'row',

      gap:
        7,
    },

    pageLabel: {
      ...typography.label,

      fontSize:
        8,
    },

    pageStepper: {
      alignItems:
        'center',

      borderRadius:
        radii.pill,

      borderWidth:
        1,

      flexDirection:
        'row',

      gap:
        10,

      minHeight:
        31,

      paddingHorizontal:
        10,
    },

    pageNumber: {
      ...typography.caption,

      fontSize:
        10,

      fontWeight:
        '800',

      minWidth:
        18,

      textAlign:
        'center',
    },

    editingBadge: {
      borderRadius:
        radii.pill,

      paddingHorizontal:
        8,

      paddingVertical:
        5,
    },

    editingText: {
      ...typography.label,

      fontSize:
        7,
    },

    titleInput: {
      ...typography.body,

      borderRadius:
        12,

      borderWidth:
        1,

      fontSize:
        13,

      minHeight:
        41,

      paddingHorizontal:
        11,

      paddingVertical:
        8,
    },

    contentInput: {
      ...typography.body,

      borderRadius:
        12,

      borderWidth:
        1,

      fontSize:
        13,

      lineHeight:
        19,

      minHeight:
        125,

      padding:
        11,
    },

    composerFooter: {
      alignItems:
        'center',

      flexDirection:
        'row',

      gap:
        10,

      justifyContent:
        'space-between',
    },

    saveState: {
      alignItems:
        'center',

      flex:
        1,

      flexDirection:
        'row',

      gap:
        5,

      minWidth:
        0,
    },

    saveStateText: {
      ...typography.caption,

      flex:
        1,

      fontSize:
        9,

      lineHeight:
        13,
    },

    saveButton: {
      alignItems:
        'center',

      borderRadius:
        radii.pill,

      flexDirection:
        'row',

      gap:
        5,

      minHeight:
        34,

      paddingHorizontal:
        14,
    },

    saveButtonText: {
      ...typography.caption,

      color:
        '#FFFFFF',

      fontSize:
        10,

      fontWeight:
        '800',
    },

    /* LIST HEADER */

    listHeader: {
      alignItems:
        'center',

      flexDirection:
        'row',

      justifyContent:
        'space-between',
    },

    listTitle: {
      ...typography.sectionTitle,

      fontSize:
        15,

      lineHeight:
        20,
    },

    count: {
      ...typography.caption,

      fontSize:
        9,

      fontWeight:
        '700',
    },

    /* NOTE LIST */

    notesScroll: {
      maxHeight:
        360,
    },

    notesList: {
      gap:
        7,

      paddingBottom:
        4,
    },

    noteRow: {
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

      padding:
        10,
    },

    noteMain: {
      flex:
        1,

      gap:
        4,

      minWidth:
        0,
    },

    noteHeading: {
      alignItems:
        'center',

      flexDirection:
        'row',

      gap:
        6,
    },

    noteTitle: {
      ...typography.body,

      flex:
        1,

      fontSize:
        12,

      fontWeight:
        '700',

      lineHeight:
        16,
    },

    pageBadge: {
      borderRadius:
        radii.pill,

      paddingHorizontal:
        7,

      paddingVertical:
        3,
    },

    pageBadgeText: {
      ...typography.label,

      fontSize:
        7,
    },

    preview: {
      ...typography.caption,

      fontSize:
        9,

      lineHeight:
        14,
    },

    noteActions: {
      flexDirection:
        'row',

      gap:
        5,
    },

    noteAction: {
      alignItems:
        'center',

      borderRadius:
        radii.pill,

      borderWidth:
        1,

      height:
        32,

      justifyContent:
        'center',

      width:
        32,
    },

    /* EMPTY / ERROR */

    empty: {
      alignItems:
        'center',

      gap:
        6,

      paddingHorizontal:
        20,

      paddingVertical:
        24,
    },

    emptyIcon: {
      alignItems:
        'center',

      borderRadius:
        radii.pill,

      height:
        42,

      justifyContent:
        'center',

      width:
        42,
    },

    emptyTitle: {
      ...typography.sectionTitle,

      fontSize:
        14,

      lineHeight:
        18,
    },

    emptyText: {
      ...typography.caption,

      fontSize:
        10,

      lineHeight:
        15,

      maxWidth:
        330,

      textAlign:
        'center',
    },

    retry: {
      ...typography.caption,

      fontSize:
        10,

      fontWeight:
        '800',
    },
  });
