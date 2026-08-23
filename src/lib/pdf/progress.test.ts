import { describe, expect, it } from 'vitest';

import { clampPdfPage, pdfReadingProgress, scalePdfZoom } from '@/lib/pdf/progress';

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

  it('scales pinch zoom while keeping the PDF within readable limits', () => {
    expect(scalePdfZoom(1, 1.25)).toBe(1.25);
    expect(scalePdfZoom(2.4, 2)).toBe(2.5);
    expect(scalePdfZoom(0.8, 0.5)).toBe(0.75);
    expect(scalePdfZoom(1.5, Number.NaN)).toBe(1);
  });
});
