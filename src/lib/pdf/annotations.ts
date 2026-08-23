import type { PdfInkPoint, PdfInkStroke } from '@/types/database';

export type AnnotationRect = Pick<DOMRect, 'height' | 'left' | 'top' | 'width'>;

export function normalizedInkPoint(clientX: number, clientY: number, pressure: number, rect: AnnotationRect): PdfInkPoint {
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    pressure: Math.min(1, Math.max(0, pressure || 0.5)),
  };
}

function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function inkStrokeHitTest(stroke: PdfInkStroke, point: PdfInkPoint, width: number, height: number, radius = 14) {
  if (stroke.points.length === 0 || width <= 0 || height <= 0) return false;
  const px = point.x * width;
  const py = point.y * height;
  if (stroke.points.length === 1) {
    return Math.hypot(px - stroke.points[0].x * width, py - stroke.points[0].y * height) <= radius;
  }
  return stroke.points.some((current, index) => {
    if (index === 0) return false;
    const previous = stroke.points[index - 1];
    return pointToSegmentDistance(px, py, previous.x * width, previous.y * height, current.x * width, current.y * height) <= radius;
  });
}

export function hasMeaningfulStroke(stroke: PdfInkStroke) {
  return stroke.points.length > 0;
}

export function parsePdfInkStrokes(value: unknown): PdfInkStroke[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5000).flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const stroke = candidate as Partial<PdfInkStroke>;
    if (typeof stroke.id !== 'string' || !['PEN', 'HIGHLIGHTER'].includes(stroke.tool ?? '') || typeof stroke.color !== 'string' || typeof stroke.width !== 'number' || !Array.isArray(stroke.points)) return [];
    const points = stroke.points.slice(0, 20000).flatMap((candidatePoint) => {
      if (!candidatePoint || typeof candidatePoint !== 'object') return [];
      const point = candidatePoint as Partial<PdfInkPoint>;
      if (![point.x, point.y, point.pressure].every((number) => typeof number === 'number' && Number.isFinite(number))) return [];
      return [{
        pressure: Math.min(1, Math.max(0, point.pressure!)),
        x: Math.min(1, Math.max(0, point.x!)),
        y: Math.min(1, Math.max(0, point.y!)),
      }];
    });
    if (points.length === 0) return [];
    return [{
      color: stroke.color.slice(0, 32),
      id: stroke.id.slice(0, 100),
      points,
      tool: stroke.tool as PdfInkStroke['tool'],
      width: Math.min(0.08, Math.max(0.0005, stroke.width)),
    }];
  });
}
