import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { radii, spacing, typography } from '@/constants/theme';
import { keys, usePdfNotes } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { parsePdfNoteDraft, pdfNoteDisplayTitle, pdfNoteValidationMessage } from '@/lib/pdf/notes';
import { deleteRecord, saveNote } from '@/services';
import type { Note, StudyMaterial } from '@/types/database';

type Editor = { content: string; id?: string; pageNumber: number; title: string };

export function PdfNotesPanel({ currentPage, material, onJumpToPage, pageCount }: { currentPage: number; material: StudyMaterial; onJumpToPage: (page: number) => void; pageCount: number }) {
  const palette = useAppTheme();
  const client = useQueryClient();
  const notes = usePdfNotes(material.id);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refreshNotes = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: keys.pdfNotes(material.id) }),
      client.invalidateQueries({ queryKey: keys.notes }),
    ]);
  };

  const save = useMutation({
    mutationFn: async (draft: Editor) => {
      const parsed = parsePdfNoteDraft(draft, pageCount);
      return saveNote({
        content: parsed.content,
        material_id: material.id,
        page_number: parsed.pageNumber,
        subject_id: material.subject_id,
        title: parsed.title,
      }, draft.id);
    },
    onSuccess: async () => { await refreshNotes(); setEditor(null); setEditorError(null); },
    onError: (error) => setEditorError(getErrorMessage(error)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteRecord('notes', id),
    onSuccess: async () => { await refreshNotes(); setDeleteId(null); },
  });

  const startNew = () => { setEditor({ content: '', pageNumber: currentPage, title: '' }); setEditorError(null); };
  const startEdit = (note: Note) => { setEditor({ content: note.content, id: note.id, pageNumber: note.page_number ?? currentPage, title: note.title ?? '' }); setEditorError(null); setDeleteId(null); };
  const submit = () => {
    if (!editor) return;
    try {
      parsePdfNoteDraft(editor, pageCount);
      setEditorError(null);
      save.mutate(editor);
    } catch (error) { setEditorError(pdfNoteValidationMessage(error)); }
  };

  return <View style={[styles.panel, { backgroundColor: palette.surface, borderColor: palette.border }]}>
    <View style={styles.header}>
      <View style={styles.headerCopy}><Text style={[styles.title, { color: palette.text }]}>Page notes</Text><Text style={[styles.caption, { color: palette.textMuted }]}>{notes.data?.length ?? 0} saved for this PDF</Text></View>
      <AppButton label={`+ Note on page ${currentPage}`} onPress={startNew} style={styles.addButton} />
    </View>

    {editor ? <View style={[styles.editor, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}>
      <View style={styles.editorHeading}><Text style={[styles.editorTitle, { color: palette.text }]}>{editor.id ? 'Edit' : 'New'} note · Page {editor.pageNumber}</Text><Text style={[styles.caption, { color: palette.textMuted }]}>Save without leaving or reloading the PDF.</Text></View>
      <FormField label="Title (optional)" maxLength={150} onChangeText={(title) => setEditor((value) => value ? { ...value, title } : value)} placeholder="Key idea, formula, reminder…" value={editor.title} />
      <FormField label="Note" maxLength={50000} multiline onChangeText={(content) => setEditor((value) => value ? { ...value, content } : value)} placeholder="Write what you want to remember from this page." style={styles.noteInput} value={editor.content} />
      {editorError ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>{editorError}</Text> : null}
      <View style={styles.editorActions}><AppButton label="Cancel" onPress={() => { setEditor(null); setEditorError(null); }} style={styles.flexButton} variant="ghost" /><AppButton label={editor.id ? 'Save changes' : 'Save note'} loading={save.isPending} onPress={submit} style={styles.flexButton} /></View>
    </View> : null}

    {notes.isLoading ? <FeedbackState loading message="Loading the notes for this PDF." title="Opening notes" /> : null}
    {notes.error ? <FeedbackState actionLabel="Try again" message={getErrorMessage(notes.error)} onAction={() => void notes.refetch()} title="Could not load page notes" /> : null}
    {!notes.isLoading && !notes.error && !notes.data?.length ? <FeedbackState message="Add a quick note while reading and it will stay linked to this page." title="No page notes yet" /> : null}
    {notes.data?.map((note) => <View key={note.id} style={[styles.noteCard, { backgroundColor: palette.surfaceAlt, borderColor: note.page_number === currentPage ? palette.accent : palette.border }]}>
      <Pressable accessibilityHint={`Jumps to page ${note.page_number}`} accessibilityRole="button" onPress={() => note.page_number && onJumpToPage(note.page_number)} style={({ pressed }) => [styles.noteJump, { opacity: pressed ? 0.72 : 1 }]}>
        <View style={styles.noteHeading}><Text style={[styles.noteTitle, { color: palette.text }]}>{pdfNoteDisplayTitle(note)}</Text><Text style={[styles.pageBadge, { backgroundColor: palette.accentSoft, color: palette.accentStrong }]}>Page {note.page_number ?? '—'}</Text></View>
        <Text numberOfLines={4} style={[styles.noteContent, { color: palette.textMuted }]}>{note.content}</Text>
        <Text style={[styles.updated, { color: palette.textMuted }]}>Updated {format(new Date(note.updated_at), 'MMM d · h:mm a')} · Tap to jump</Text>
      </Pressable>
      {deleteId === note.id ? <View style={styles.noteActions}><AppButton label="Keep note" onPress={() => setDeleteId(null)} style={styles.flexButton} variant="ghost" /><AppButton label="Delete now" loading={remove.isPending} onPress={() => remove.mutate(note.id)} style={styles.flexButton} variant="danger" /></View> : <View style={styles.noteActions}><AppButton label="Edit" onPress={() => startEdit(note)} style={styles.flexButton} variant="secondary" /><AppButton label="Delete" onPress={() => setDeleteId(note.id)} style={styles.flexButton} variant="ghost" /></View>}
      {remove.error && deleteId === note.id ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.danger }]}>Could not delete note: {getErrorMessage(remove.error)}</Text> : null}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  panel: { borderRadius: radii.xl, borderWidth: 1, gap: spacing.md, marginTop: spacing.xl, padding: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  headerCopy: { flex: 1, gap: spacing.xs },
  title: { ...typography.sectionTitle, fontSize: 20 },
  caption: typography.caption,
  addButton: { minHeight: 46, paddingHorizontal: spacing.md },
  editor: { borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  editorHeading: { gap: spacing.xs },
  editorTitle: typography.sectionTitle,
  noteInput: { minHeight: 140 },
  editorActions: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, minHeight: 46 },
  error: typography.caption,
  noteCard: { borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  noteJump: { gap: spacing.sm, padding: spacing.md },
  noteHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  noteTitle: { ...typography.sectionTitle, flex: 1 },
  pageBadge: { ...typography.label, borderRadius: radii.pill, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  noteContent: typography.body,
  updated: typography.caption,
  noteActions: { borderTopWidth: 0, flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
});
