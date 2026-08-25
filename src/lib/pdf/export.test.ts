import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { annotatedPdfFileName, createAnnotatedPdf, pdfRgbFromHex } from '@/lib/pdf/export';

describe('annotated PDF export', () => {
  it('creates a readable PDF while ignoring annotation pages outside the document', async () => {
    const source = await PDFDocument.create();
    source.addPage([200, 300]);
    const sourceBytes = await source.save();

    const exported = await createAnnotatedPdf(sourceBytes, [
      {
        page_number: 1,
        strokes: [
          {
            color: '#C18DB4',
            id: 'stroke-1',
            points: [
              { pressure: 0.5, x: 0.1, y: 0.2 },
              { pressure: 0.5, x: 0.8, y: 0.7 },
            ],
            tool: 'PEN',
            width: 0.004,
          },
        ],
      },
      {
        page_number: 2,
        strokes: [
          {
            color: '#87A7D0',
            id: 'outside',
            points: [{ pressure: 0.5, x: 0.2, y: 0.2 }],
            tool: 'HIGHLIGHTER',
            width: 0.02,
          },
        ],
      },
    ]);

    const reopened = await PDFDocument.load(exported.bytes);
    expect(reopened.getPageCount()).toBe(1);
    expect(exported.annotatedPageCount).toBe(1);
    expect(exported.strokeCount).toBe(1);
    expect(exported.bytes.byteLength).toBeGreaterThan(sourceBytes.byteLength);
  });

  it('sanitizes the downloaded file name', () => {
    expect(annotatedPdfFileName('Psychology: Week 1?.PDF')).toBe(
      'Psychology- Week 1-annotated.pdf',
    );
    expect(annotatedPdfFileName(null, '')).toBe('study-material-annotated.pdf');
  });

  it('supports short hex colors and falls back for invalid colors', () => {
    expect(pdfRgbFromHex('#fff')).toEqual([1, 1, 1]);
    expect(pdfRgbFromHex('invalid')).toEqual([14 / 255, 31 / 255, 47 / 255]);
  });
});
