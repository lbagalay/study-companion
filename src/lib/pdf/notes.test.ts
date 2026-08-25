import { describe, expect, it } from 'vitest';

import { parsePdfNoteDraft, pdfNoteDisplayTitle, pdfNoteValidationMessage } from '@/lib/pdf/notes';

describe('PDF page notes', () => {
  it('normalizes an optional title while preserving the linked page', () => {
    expect(
      parsePdfNoteDraft({ content: '  Important definition  ', pageNumber: 4, title: '  ' }, 12),
    ).toEqual({ content: 'Important definition', pageNumber: 4, title: null });
  });

  it('rejects empty notes and pages outside the PDF', () => {
    expect(() => parsePdfNoteDraft({ content: ' ', pageNumber: 2, title: '' }, 12)).toThrow(
      'Write something before saving.',
    );
    expect(() =>
      parsePdfNoteDraft({ content: 'Remember this', pageNumber: 13, title: '' }, 12),
    ).toThrow('Choose a page from 1 to 12.');
  });

  it('provides a useful label when the optional title is empty', () => {
    expect(pdfNoteDisplayTitle({ page_number: 7, title: null })).toBe('Page 7 note');
    expect(pdfNoteDisplayTitle({ page_number: 7, title: 'Key formula' })).toBe('Key formula');
  });

  it('presents validation failures as a friendly sentence', () => {
    try {
      parsePdfNoteDraft({ content: '', pageNumber: 1, title: '' }, 3);
    } catch (error) {
      expect(pdfNoteValidationMessage(error)).toBe('Write something before saving.');
    }
  });
});
