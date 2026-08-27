import { requireSupabaseClient } from '@/lib/supabase/client';
import { createClientUuid } from '@/lib/ids';
import type { Database, PdfAnnotation, PdfInkStroke } from '@/types/database';
import { File } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { extractStudyLoadLocally, type StudyLoadProgress } from '@/lib/study-load/localExtractor';
import type { InspectedPdf } from '@/lib/pdf/types';
import { studyLoadExtractionSchema, type StudyLoadImportSubject } from '@/lib/study-load/schema';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type EntityTableName = Exclude<
  TableName,
  'profiles' | 'web_push_subscriptions' | 'notification_deliveries'
>;
export type InsertOf<T extends TableName> = Tables[T]['Insert'];
export type UpdateOf<T extends TableName> = Tables[T]['Update'];
export function check(error: { message: string } | null) {
  if (!error) return;
  const value = error.message.toLowerCase();
  if (value.includes('row-level security') || value.includes('permission'))
    throw new Error('You do not have permission to change this item.');
  if (value.includes('duplicate')) throw new Error('That item already exists.');
  if (value.includes('jwt') || value.includes('session'))
    throw new Error('Your session has expired. Please sign in again.');
  if (value.includes('violates') || value.includes('invalid'))
    throw new Error('Some information is invalid. Review the form and try again.');
  throw new Error('The request could not be completed. Check your connection and try again.');
}

export async function listSubjects() {
  const { data, error } = await requireSupabaseClient().from('subjects').select('*').order('name');
  check(error);
  return data ?? [];
}
export async function getSubject(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveSubject(input: InsertOf<'subjects'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('subjects').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('subjects').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data;
}
export async function uploadFolderSkin(subjectId: string, asset: DocumentPickerAsset) {
  const supabase = requireSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  check(userError);
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.');
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userData.user.id}/${subjectId}/${Date.now()}-${safeName}`;
  const bytes = asset.file
    ? await asset.file.arrayBuffer()
    : await new File(asset.uri).arrayBuffer();
  const { error } = await supabase.storage
    .from('folder-skins')
    .upload(path, bytes, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
  check(error);
  return path;
}
export function getFolderSkinUrl(path: string) {
  return requireSupabaseClient().storage.from('folder-skins').getPublicUrl(path).data.publicUrl;
}
export async function removeFolderSkin(path: string) {
  const { error } = await requireSupabaseClient().storage.from('folder-skins').remove([path]);
  check(error);
}
export async function extractStudyLoad(
  asset: DocumentPickerAsset,
  onProgress?: (progress: StudyLoadProgress) => void,
) {
  return studyLoadExtractionSchema.parse(await extractStudyLoadLocally(asset, onProgress));
}
export async function importStudyLoad(subjects: StudyLoadImportSubject[]) {
  const { data, error } = await requireSupabaseClient().rpc('import_study_load', {
    p_subjects: subjects,
  });
  check(error);
  return data;
}

export async function listSchedules() {
  const { data, error } = await requireSupabaseClient()
    .from('class_schedules')
    .select('*')
    .order('day_of_week')
    .order('start_time');
  check(error);
  return data ?? [];
}
export async function getSchedule(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('class_schedules')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveSchedule(input: InsertOf<'class_schedules'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('class_schedules').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('class_schedules').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data;
}

export async function listAssignments() {
  const { data, error } = await requireSupabaseClient()
    .from('assignments')
    .select('*')
    .order('due_at');
  check(error);
  return data ?? [];
}
export async function getAssignment(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('assignments')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveAssignment(input: InsertOf<'assignments'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('assignments').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('assignments').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data;
}
export async function updateAssignment(id: string, input: UpdateOf<'assignments'>) {
  const { data, error } = await requireSupabaseClient()
    .from('assignments')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  check(error);
  return data;
}

export async function listExams() {
  const { data, error } = await requireSupabaseClient().from('exams').select('*').order('exam_at');
  check(error);
  return data ?? [];
}
export async function getExam(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('exams')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveExam(input: InsertOf<'exams'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('exams').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('exams').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data;
}
export async function updateExam(id: string, input: UpdateOf<'exams'>) {
  const { data, error } = await requireSupabaseClient()
    .from('exams')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  check(error);
  return data;
}

export async function listMaterials() {
  const { data, error } = await requireSupabaseClient()
    .from('study_materials')
    .select('*')
    .order('created_at', { ascending: false });
  check(error);
  return data ?? [];
}
export async function getMaterial(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('study_materials')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveMaterial(input: InsertOf<'study_materials'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('study_materials').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('study_materials').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data!;
}
/**
 * A blank-canvas quick note: a study material with no file, annotated with
 * the same ink tools as a PDF page. `page_count: 1` satisfies the same
 * pdf_annotations RLS check a real PDF page relies on.
 */
export async function createCanvasNote(subjectId: string, title: string) {
  return saveMaterial({
    page_count: 1,
    subject_id: subjectId,
    title,
    type: 'CANVAS',
  } as InsertOf<'study_materials'>);
}
export async function savePdfMaterial(
  input: Pick<
    InsertOf<'study_materials'>,
    'completed' | 'description' | 'favorite' | 'subject_id' | 'title'
  >,
  pdf: InspectedPdf,
  id?: string,
  previousPath?: string | null,
) {
  const supabase = requireSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  check(userError);
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.');

  const materialId = id ?? createClientUuid();
  const path = `${userData.user.id}/${input.subject_id}/${materialId}/material.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('study-materials')
    .upload(path, pdf.bytes, {
      cacheControl: '3600',
      contentType: 'application/pdf',
      upsert: Boolean(id && previousPath === path),
    });
  check(uploadError);

  const values: InsertOf<'study_materials'> = {
    ...input,
    external_url: null,
    file_name: pdf.fileName,
    file_size: pdf.fileSize,
    file_url: path,
    id: materialId,
    last_read_page: 1,
    page_count: pdf.pageCount,
    type: 'PDF',
    uploaded_at: new Date().toISOString(),
  };
  const query = id
    ? supabase.from('study_materials').update(values).eq('id', id).select().single()
    : supabase.from('study_materials').insert(values).select().single();
  const { data, error } = await query;
  if (error) {
    if (!id || previousPath !== path) await supabase.storage.from('study-materials').remove([path]);
    check(error);
  }
  if (previousPath && previousPath !== path)
    await supabase.storage.from('study-materials').remove([previousPath]);
  return data!;
}
export async function uploadMaterialFile(subjectId: string, asset: DocumentPickerAsset) {
  const supabase = requireSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  check(userError);
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.');
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${userData.user.id}/${subjectId}/${Date.now()}-${safeName}`;
  const bytes = asset.file
    ? await asset.file.arrayBuffer()
    : await new File(asset.uri).arrayBuffer();
  const { error } = await supabase.storage.from('study-materials').upload(path, bytes, {
    contentType: asset.mimeType ?? 'application/octet-stream',
    upsert: false,
  });
  check(error);
  return path;
}
export async function getMaterialUrl(path: string, expiresIn = 300) {
  const { data, error } = await requireSupabaseClient()
    .storage.from('study-materials')
    .createSignedUrl(path, expiresIn);
  check(error);
  return data!.signedUrl;
}
/**
 * Caches a PDF page's extracted text so the assistant can ground answers in
 * it without re-parsing the PDF on every question. Safe to call every time a
 * page loads — the unique (material_id, page_number) constraint plus
 * `ignoreDuplicates` means a page already cached is a no-op, not an error.
 */
export async function cacheMaterialPageText(
  materialId: string,
  pageNumber: number,
  content: string,
) {
  const { error } = await requireSupabaseClient()
    .from('study_material_pages')
    .upsert(
      { material_id: materialId, page_number: pageNumber, content },
      { onConflict: 'material_id,page_number', ignoreDuplicates: true },
    );
  check(error);
}
export async function updatePdfReadingProgress(
  materialId: string,
  page: number,
  pageCount: number,
) {
  const { data, error } = await requireSupabaseClient().rpc('update_pdf_reading_progress', {
    p_material_id: materialId,
    p_page: page,
    p_page_count: pageCount,
  });
  check(error);
  return data as { last_opened_at: string; last_read_page: number; page_count: number };
}
export async function deleteMaterial(id: string, path?: string | null) {
  const supabase = requireSupabaseClient();
  if (path) {
    const { error } = await supabase.storage.from('study-materials').remove([path]);
    check(error);
  }
  const { error } = await supabase.from('study_materials').delete().eq('id', id);
  check(error);
}

export async function listNotes() {
  const { data, error } = await requireSupabaseClient()
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  check(error);
  return data ?? [];
}
export async function listPdfNotes(materialId: string) {
  const { data, error } = await requireSupabaseClient()
    .from('notes')
    .select('*')
    .eq('material_id', materialId)
    .order('page_number')
    .order('updated_at', { ascending: false });
  check(error);
  return data ?? [];
}
export async function getNote(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveNote(input: InsertOf<'notes'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('notes').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('notes').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data;
}

export async function getPdfAnnotations(materialId: string, pageNumber: number) {
  const { data, error } = await requireSupabaseClient()
    .from('pdf_annotations')
    .select('*')
    .eq('material_id', materialId)
    .eq('page_number', pageNumber)
    .maybeSingle();
  check(error);
  return data as PdfAnnotation | null;
}

export async function listPdfAnnotations(materialId: string) {
  const { data, error } = await requireSupabaseClient()
    .from('pdf_annotations')
    .select('*')
    .eq('material_id', materialId)
    .order('page_number');
  check(error);
  return (data ?? []) as PdfAnnotation[];
}

export async function savePdfAnnotations(
  materialId: string,
  pageNumber: number,
  strokes: PdfInkStroke[],
) {
  const { data, error } = await requireSupabaseClient()
    .from('pdf_annotations')
    .upsert(
      {
        material_id: materialId,
        page_number: pageNumber,
        strokes:
          strokes as unknown as Database['public']['Tables']['pdf_annotations']['Insert']['strokes'],
      },
      { onConflict: 'user_id,material_id,page_number' },
    )
    .select()
    .single();
  check(error);
  return data as PdfAnnotation;
}

export async function listSessions() {
  const { data, error } = await requireSupabaseClient()
    .from('study_sessions')
    .select('*')
    .order('planned_at');
  check(error);
  return data ?? [];
}
export async function getSession(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('study_sessions')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function saveSession(input: InsertOf<'study_sessions'>, id?: string) {
  const query = id
    ? requireSupabaseClient().from('study_sessions').update(input).eq('id', id).select().single()
    : requireSupabaseClient().from('study_sessions').insert(input).select().single();
  const { data, error } = await query;
  check(error);
  return data;
}
export async function updateSession(id: string, input: UpdateOf<'study_sessions'>) {
  const { data, error } = await requireSupabaseClient()
    .from('study_sessions')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  check(error);
  return data;
}
export async function saveSessions(inputs: InsertOf<'study_sessions'>[]) {
  const { data, error } = await requireSupabaseClient()
    .from('study_sessions')
    .insert(inputs)
    .select();
  check(error);
  return data ?? [];
}

export async function getProfile(id: string) {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  check(error);
  return data;
}
export async function updateProfile(id: string, input: UpdateOf<'profiles'>) {
  const { data, error } = await requireSupabaseClient()
    .from('profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  check(error);
  return data;
}
export async function deleteRecord(table: EntityTableName, id: string) {
  const { error } = await requireSupabaseClient().from(table).delete().eq('id', id);
  check(error);
}
