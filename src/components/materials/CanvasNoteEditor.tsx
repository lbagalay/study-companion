import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAssistantScreenContext } from '@/components/assistant/AssistantProvider';
import {
  PdfAnnotationPage,
  PdfAnnotationProvider,
  PdfAnnotationToolbar,
} from '@/components/materials/PdfAnnotationWorkspace';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { keys } from '@/hooks/useStudyData';
import { getErrorMessage } from '@/lib/errors';
import { getMaterial, saveMaterial, type InsertOf } from '@/services';
import type { StudyMaterial } from '@/types/database';

/** Blank-canvas quick note: the same ink tools as a PDF page, no file underneath. */
export function CanvasNoteEditor({ materialId }: { materialId: string }) {
  const palette = useAppTheme();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();

  const material = useQuery({
    queryKey: ['material', materialId],
    queryFn: () => getMaterial(materialId),
    enabled: Boolean(materialId),
  });

  useAssistantScreenContext(
    useMemo(
      () => ({
        type: 'study_material' as const,
        id: materialId,
        label: material.data?.title ?? 'Canvas note',
      }),
      [materialId, material.data?.title],
    ),
  );

  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  const startRenaming = () => {
    setRenameDraft(material.data?.title ?? '');
    setRenaming(true);
  };

  const confirmRenaming = async () => {
    const trimmed = renameDraft.trim();

    if (!trimmed || !material.data || renameSaving) {
      setRenaming(false);
      return;
    }

    if (trimmed === material.data.title) {
      setRenaming(false);
      return;
    }

    setRenameSaving(true);

    try {
      const saved = await saveMaterial(
        { title: trimmed } as InsertOf<'study_materials'>,
        materialId,
      );

      queryClient.setQueryData<StudyMaterial>(['material', materialId], saved);
      queryClient.setQueryData<StudyMaterial[]>(keys.materials, (items) =>
        items?.map((item) => (item.id === materialId ? { ...item, title: trimmed } : item)),
      );

      setRenaming(false);
    } catch (error) {
      // Keep the input open so the title isn't silently lost.
      window.alert(getErrorMessage(error));
    } finally {
      setRenameSaving(false);
    }
  };

  if (material.isLoading) {
    return <FeedbackState loading message="Opening your canvas note." title="Loading" />;
  }

  if (material.error) {
    return (
      <FeedbackState
        actionLabel="Try again"
        message={getErrorMessage(material.error)}
        onAction={() => void material.refetch()}
        title="Could not open this canvas note"
      />
    );
  }

  if (!material.data || material.data.type !== 'CANVAS') {
    return <FeedbackState message="This canvas note is unavailable." title="Not found" />;
  }

  const pageWidth = Math.min(Math.max(width - 32, 280), 980);
  const pageHeight = Math.round(pageWidth * 1.294);

  return (
    <PdfAnnotationProvider
      canExport={false}
      currentPage={1}
      materialId={materialId}
      onExport={() => {}}
      onPinchZoom={() => {}}
    >
      <SafeAreaView
        edges={['top']}
        style={[styles.safeArea, { backgroundColor: palette.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {renaming ? (
            <View style={styles.renameRow}>
              <TextInput
                autoFocus
                onChangeText={setRenameDraft}
                onSubmitEditing={() => void confirmRenaming()}
                returnKeyType="done"
                selectionColor={palette.accent}
                style={[styles.renameInput, { borderColor: palette.border, color: palette.text }]}
                value={renameDraft}
              />

              <Pressable
                accessibilityLabel="Save note title"
                disabled={renameSaving}
                onPress={() => void confirmRenaming()}
                style={[styles.renameIconButton, { backgroundColor: palette.accentSolid }]}
              >
                <Ionicons color="#FFFFFF" name="checkmark" size={16} />
              </Pressable>

              <Pressable
                accessibilityLabel="Cancel rename"
                onPress={() => setRenaming(false)}
                style={[
                  styles.renameIconButton,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons color={palette.text} name="close" size={16} />
              </Pressable>
            </View>
          ) : (
            <ScreenHeader back title={material.data.title}>
              <Pressable
                accessibilityLabel="Rename canvas note"
                hitSlop={8}
                onPress={startRenaming}
                style={styles.renameTrigger}
              >
                <Ionicons color={palette.textMuted} name="pencil-outline" size={15} />
                <Text style={[styles.renameTriggerText, { color: palette.textMuted }]}>Rename</Text>
              </Pressable>
            </ScreenHeader>
          )}

          <View
            style={[
              styles.viewer,
              { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
            ]}
          >
            <PdfAnnotationToolbar />

            <View style={styles.pageWrap}>
              <PdfAnnotationPage height={pageHeight} pageNumber={1} width={pageWidth}>
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    height: pageHeight,
                    width: pageWidth,
                  }}
                />
              </PdfAnnotationPage>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </PdfAnnotationProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  renameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  renameInput: {
    ...typography.sectionTitle,
    borderBottomWidth: 1,
    flex: 1,
    fontSize: 22,
    paddingVertical: 2,
  },
  renameIconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  renameTrigger: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  renameTriggerText: {
    ...typography.caption,
  },
  viewer: {
    alignItems: 'stretch',
    borderRadius: radii.lg,
    borderWidth: 1,
    minHeight: 420,
    overflow: 'visible',
    padding: spacing.sm,
  },
  pageWrap: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 8,
    width: '100%',
  },
});
