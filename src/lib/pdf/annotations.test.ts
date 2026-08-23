import { describe, expect, it } from 'vitest';

import { hasMeaningfulStroke, inkStrokeHitTest, normalizedInkPoint, parsePdfInkStrokes } from '@/lib/pdf/annotations';
import type { PdfInkStroke } from '@/types/database';

const stroke: PdfInkStroke = {
  color: '#111111',
  id: 'stroke-1',
  points: [{ x: 0.1, y: 0.5, pressure: 0.5 }, { x: 0.9, y: 0.5, pressure: 0.5 }],
  tool: 'PEN',
  width: 0.003,
};

describe('PDF ink annotation geometry', () => {
  it('normalizes pointer coordinates and clamps them to the page', () => {
    expect(normalizedInkPoint(60, 70, 0.8, { height: 200, left: 10, top: 20, width: 100 })).toEqual({ x: 0.5, y: 0.25, pressure: 0.8 });
    expect(normalizedInkPoint(-20, 400, 0, { height: 200, left: 10, top: 20, width: 100 })).toEqual({ x: 0, y: 1, pressure: 0.5 });
  });

  it('finds strokes close to the eraser at different page sizes', () => {
    expect(inkStrokeHitTest(stroke, { x: 0.5, y: 0.51, pressure: 0.5 }, 1000, 1400)).toBe(true);
    expect(inkStrokeHitTest(stroke, { x: 0.5, y: 0.8, pressure: 0.5 }, 1000, 1400)).toBe(false);
  });

  it('keeps dot strokes and rejects empty strokes', () => {
    expect(hasMeaningfulStroke({ ...stroke, points: [stroke.points[0]] })).toBe(true);
    expect(hasMeaningfulStroke({ ...stroke, points: [] })).toBe(false);
  });

  it('ignores malformed stored strokes and clamps valid coordinates', () => {
    expect(parsePdfInkStrokes([null, { ...stroke, points: [{ x: 2, y: -1, pressure: 4 }] }])).toEqual([
      { ...stroke, points: [{ x: 1, y: 0, pressure: 1 }] },
    ]);
  });
});
