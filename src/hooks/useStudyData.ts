import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as service from '@/services';
import type { Database } from '@/types/database';

export const keys = { subjects: ['subjects'] as const, schedules: ['schedules'] as const, assignments: ['assignments'] as const, exams: ['exams'] as const, materials: ['materials'] as const, notes: ['notes'] as const, sessions: ['sessions'] as const };
export function useSubjects() { return useQuery({ queryKey: keys.subjects, queryFn: service.listSubjects }); }
export function useSchedules() { return useQuery({ queryKey: keys.schedules, queryFn: service.listSchedules }); }
export function useAssignments() { return useQuery({ queryKey: keys.assignments, queryFn: service.listAssignments }); }
export function useExams() { return useQuery({ queryKey: keys.exams, queryFn: service.listExams }); }
export function useMaterials() { return useQuery({ queryKey: keys.materials, queryFn: service.listMaterials }); }
export function useNotes() { return useQuery({ queryKey: keys.notes, queryFn: service.listNotes }); }
export function useSessions() { return useQuery({ queryKey: keys.sessions, queryFn: service.listSessions }); }
export function useProfile(id?: string) { return useQuery({ queryKey: ['profile', id], queryFn: () => service.getProfile(id!), enabled: Boolean(id) }); }
export function useDeleteRecord(table: Exclude<keyof Database['public']['Tables'], 'profiles' | 'web_push_subscriptions' | 'notification_deliveries'>, key: readonly string[]) { const client = useQueryClient(); return useMutation({ mutationFn: (id: string) => service.deleteRecord(table, id), onSuccess: () => client.invalidateQueries({ queryKey: key }) }); }
