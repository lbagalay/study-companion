import { parsePdfInkStrokes } from '@/lib/pdf/annotations';

type AnnotationPage = {
  page_number: number;
  strokes: unknown;
};

export type AnnotatedPdfExport = {
  annotatedPageCount: number;
  bytes: Uint8Array;
  strokeCount: number;
};

function hexChannel(value: string) {
  return Number.parseInt(value, 16) / 255;
}

export function pdfRgbFromHex(value: string): [number, number, number] {
  const normalized = value.trim().replace(/^#/, '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((channel) => channel.repeat(2)).join('')
    : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return [14 / 255, 31 / 255, 47 / 255];
  return [hexChannel(expanded.slice(0, 2)), hexChannel(expanded.slice(2, 4)), hexChannel(expanded.slice(4, 6))];
}

export function annotatedPdfFileName(fileName?: string | null, title?: string | null) {
  const source = (fileName || title || 'study-material').trim().replace(/\.pdf$/i, '');
  const safeBase = source
    .replace(/[\\/:*?"<>|%]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || 'study-material';
  return `${safeBase}-annotated.pdf`;
}

export async function createAnnotatedPdf(sourceBytes: ArrayBuffer | Uint8Array, annotations: AnnotationPage[]): Promise<AnnotatedPdfExport> {
  const { BlendMode, PDFDocument, rgb } = await import('pdf-lib/dist/pdf-lib.esm.js');
  const pdf = await PDFDocument.load(sourceBytes);
  const pages = pdf.getPages();
  let annotatedPageCount = 0;
  let strokeCount = 0;

  annotations.forEach((annotation) => {
    if (!Number.isInteger(annotation.page_number) || annotation.page_number < 1 || annotation.page_number > pages.length) return;
    const strokes = parsePdfInkStrokes(annotation.strokes);
    if (strokes.length === 0) return;
    const page = pages[annotation.page_number - 1];
    const { height, width } = page.getSize();
    const pageScale = Math.min(width, height);
    annotatedPageCount += 1;

    strokes.forEach((stroke) => {
      const [red, green, blue] = pdfRgbFromHex(stroke.color);
      const color = rgb(red, green, blue);
      const thickness = Math.max(0.5, stroke.width * pageScale);
      const opacity = stroke.tool === 'HIGHLIGHTER' ? 0.34 : 1;
      const blendMode = stroke.tool === 'HIGHLIGHTER' ? BlendMode.Multiply : BlendMode.Normal;
      const points = stroke.points.map((point) => ({ x: point.x * width, y: height - point.y * height }));

      if (points.length === 1) {
        page.drawCircle({ blendMode, color, opacity, size: thickness / 2, x: points[0].x, y: points[0].y });
      } else {
        for (let index = 1; index < points.length; index += 1) {
          page.drawLine({ blendMode, color, end: points[index], opacity, start: points[index - 1], thickness });
        }
      }
      strokeCount += 1;
    });
  });

  return { annotatedPageCount, bytes: await pdf.save(), strokeCount };
}

export function downloadPdf(bytes: Uint8Array, fileName: string) {
  if (typeof document === 'undefined') throw new Error('PDF downloads are only available in the installed PWA or a web browser.');
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
