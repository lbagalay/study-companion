import { z } from 'zod';

import type { Note } from '@/types/database';

const pdfNoteDraftSchema = z.object({
  content: z.string().trim().min(1, 'Write something before saving.').max(50000, 'Keep the note under 50,000 characters.'),
  pageNumber: z.number().int().min(1, 'Choose a valid PDF page.').max(50000, 'Choose a valid PDF page.'),
  title: z.string().trim().max(150, 'Keep the title under 150 characters.').transform((value) => value || null),
});

export function parsePdfNoteDraft(input: { content: string; pageNumber: number; title: string }, pageCount: number) {
  const parsed = pdfNoteDraftSchema.parse(input);
  if (parsed.pageNumber > pageCount) throw new Error(`Choose a page from 1 to ${pageCount}.`);
  return parsed;
}

export function pdfNoteDisplayTitle(note: Pick<Note, 'page_number' | 'title'>) {
  return note.title?.trim() || `Page ${note.page_number ?? '—'} note`;
}

export function pdfNoteValidationMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Review the note and try again.';
  return error instanceof Error ? error.message : 'Review the note and try again.';
}
