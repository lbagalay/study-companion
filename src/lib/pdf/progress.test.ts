import { describe, expect, it } from 'vitest';

import { clampPdfPage, pdfReadingProgress } from '@/lib/pdf/progress';

describe('PDF reading progress', () => {
  it('calculates reading position as the current page divided by page count', () => {
    expect(pdfReadingProgress(17, 42)).toBe(40);
    expect(pdfReadingProgress(42, 42)).toBe(100);
  });

  it('clamps invalid or out-of-range pages', () => {
    expect(clampPdfPage(0, 12)).toBe(1);
    expect(clampPdfPage(99, 12)).toBe(12);
    expect(pdfReadingProgress(99, 12)).toBe(100);
    expect(pdfReadingProgress(1, 0)).toBe(0);
  });
});
