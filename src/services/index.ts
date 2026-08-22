import { requireSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { File } from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
export type InsertOf<T extends TableName> = Tables[T]['Insert'];
export type UpdateOf<T extends TableName> = Tables[T]['Update'];
function check(error: { message: string } | null) {
  if (!error) return;
  const value = error.message.toLowerCase();
  if (value.includes('row-level security') || value.includes('permission')) throw new Error('You do not have permission to change this item.');
  if (value.includes('duplicate')) throw new Error('That item already exists.');
  if (value.includes('jwt') || value.includes('session')) throw new Error('Your session has expired. Please sign in again.');
  if (value.includes('violates') || value.includes('invalid')) throw new Error('Some information is invalid. Review the form and try again.');
  throw new Error('The request could not be completed. Check your connection and try again.');
}

export async function listSubjects() { const { data, error } = await requireSupabaseClient().from('subjects').select('*').order('name'); check(error); return data ?? []; }
export async function getSubject(id: string) { const { data, error } = await requireSupabaseClient().from('subjects').select('*').eq('id', id).single(); check(error); return data; }
export async function saveSubject(input: InsertOf<'subjects'>, id?: string) { const query = id ? requireSupabaseClient().from('subjects').update(input).eq('id', id).select().single() : requireSupabaseClient().from('subjects').insert(input).select().single(); const { data, error } = await query; check(error); return data; }

export async function listSchedules() { const { data, error } = await requireSupabaseClient().from('class_schedules').select('*').order('day_of_week').order('start_time'); check(error); return data ?? []; }
export async function getSchedule(id: string) { const { data, error } = await requireSupabaseClient().from('class_schedules').select('*').eq('id', id).single(); check(error); return data; }
export async function saveSchedule(input: InsertOf<'class_schedules'>, id?: string) { const query = id ? requireSupabaseClient().from('class_schedules').update(input).eq('id', id).select().single() : requireSupabaseClient().from('class_schedules').insert(input).select().single(); const { data, error } = await query; check(error); return data; }

export async function listAssignments() { const { data, error } = await requireSupabaseClient().from('assignments').select('*').order('due_at'); check(error); return data ?? []; }
export async function getAssignment(id: string) { const { data, error } = await requireSupabaseClient().from('assignments').select('*').eq('id', id).single(); check(error); return data; }
export async function saveAssignment(input: InsertOf<'assignments'>, id?: string) { const query = id ? requireSupabaseClient().from('assignments').update(input).eq('id', id).select().single() : requireSupabaseClient().from('assignments').insert(input).select().single(); const { data, error } = await query; check(error); return data; }
export async function updateAssignment(id: string, input: UpdateOf<'assignments'>) { const { data, error } = await requireSupabaseClient().from('assignments').update(input).eq('id', id).select().single(); check(error); return data; }

export async function listExams() { const { data, error } = await requireSupabaseClient().from('exams').select('*').order('exam_at'); check(error); return data ?? []; }
export async function getExam(id: string) { const { data, error } = await requireSupabaseClient().from('exams').select('*').eq('id', id).single(); check(error); return data; }
export async function saveExam(input: InsertOf<'exams'>, id?: string) { const query = id ? requireSupabaseClient().from('exams').update(input).eq('id', id).select().single() : requireSupabaseClient().from('exams').insert(input).select().single(); const { data, error } = await query; check(error); return data; }
export async function updateExam(id: string, input: UpdateOf<'exams'>) { const { data, error } = await requireSupabaseClient().from('exams').update(input).eq('id', id).select().single(); check(error); return data; }

export async function listMaterials() { const { data, error } = await requireSupabaseClient().from('study_materials').select('*').order('created_at', { ascending: false }); check(error); return data ?? []; }
export async function getMaterial(id: string) { const { data, error } = await requireSupabaseClient().from('study_materials').select('*').eq('id', id).single(); check(error); return data; }
export async function saveMaterial(input: InsertOf<'study_materials'>, id?: string) { const query = id ? requireSupabaseClient().from('study_materials').update(input).eq('id', id).select().single() : requireSupabaseClient().from('study_materials').insert(input).select().single(); const { data, error } = await query; check(error); return data; }
export async function uploadMaterialFile(subjectId: string, asset: DocumentPickerAsset) {
  const supabase = requireSupabaseClient(); const { data: userData, error: userError } = await supabase.auth.getUser(); check(userError);
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.');
  const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '-'); const path = `${userData.user.id}/${subjectId}/${Date.now()}-${safeName}`;
  const bytes = asset.file ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();
  const { error } = await supabase.storage.from('study-materials').upload(path, bytes, { contentType: asset.mimeType ?? 'application/octet-stream', upsert: false }); check(error); return path;
}
export async function getMaterialUrl(path: string) { const { data, error } = await requireSupabaseClient().storage.from('study-materials').createSignedUrl(path, 300); check(error); return data!.signedUrl; }
export async function deleteMaterial(id: string, path?: string | null) { const supabase = requireSupabaseClient(); if (path) { const { error } = await supabase.storage.from('study-materials').remove([path]); check(error); } const { error } = await supabase.from('study_materials').delete().eq('id', id); check(error); }

export async function listNotes() { const { data, error } = await requireSupabaseClient().from('notes').select('*').order('updated_at', { ascending: false }); check(error); return data ?? []; }
export async function getNote(id: string) { const { data, error } = await requireSupabaseClient().from('notes').select('*').eq('id', id).single(); check(error); return data; }
export async function saveNote(input: InsertOf<'notes'>, id?: string) { const query = id ? requireSupabaseClient().from('notes').update(input).eq('id', id).select().single() : requireSupabaseClient().from('notes').insert(input).select().single(); const { data, error } = await query; check(error); return data; }

export async function listSessions() { const { data, error } = await requireSupabaseClient().from('study_sessions').select('*').order('planned_at'); check(error); return data ?? []; }
export async function getSession(id: string) { const { data, error } = await requireSupabaseClient().from('study_sessions').select('*').eq('id', id).single(); check(error); return data; }
export async function saveSession(input: InsertOf<'study_sessions'>, id?: string) { const query = id ? requireSupabaseClient().from('study_sessions').update(input).eq('id', id).select().single() : requireSupabaseClient().from('study_sessions').insert(input).select().single(); const { data, error } = await query; check(error); return data; }
export async function updateSession(id: string, input: UpdateOf<'study_sessions'>) { const { data, error } = await requireSupabaseClient().from('study_sessions').update(input).eq('id', id).select().single(); check(error); return data; }
export async function saveSessions(inputs: InsertOf<'study_sessions'>[]) { const { data, error } = await requireSupabaseClient().from('study_sessions').insert(inputs).select(); check(error); return data ?? []; }

export async function getProfile(id: string) { const { data, error } = await requireSupabaseClient().from('profiles').select('*').eq('id', id).single(); check(error); return data; }
export async function updateProfile(id: string, input: UpdateOf<'profiles'>) { const { data, error } = await requireSupabaseClient().from('profiles').update(input).eq('id', id).select().single(); check(error); return data; }
export async function deleteRecord(table: Exclude<TableName, 'profiles'>, id: string) { const { error } = await requireSupabaseClient().from(table).delete().eq('id', id); check(error); }
