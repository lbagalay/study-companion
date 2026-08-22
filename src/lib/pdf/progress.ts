export function clampPdfPage(page: number, pageCount: number) {
  if (!Number.isFinite(pageCount) || pageCount < 1) return 1;
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.round(page), 1), Math.round(pageCount));
}

export function pdfReadingProgress(page: number, pageCount: number) {
  if (!Number.isFinite(pageCount) || pageCount < 1) return 0;
  return Math.round((clampPdfPage(page, pageCount) / pageCount) * 100);
}
