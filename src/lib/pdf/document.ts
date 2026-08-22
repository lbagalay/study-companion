// Web implementation. Metro selects document.native.ts on iOS and Android.
import type { DocumentPickerAsset } from 'expo-document-picker';

import { maxPdfBytes, type InspectedPdf } from '@/lib/pdf/types';

async function pdfBytes(asset: DocumentPickerAsset) {
  if (asset.file) return asset.file.arrayBuffer();
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('The selected PDF could not be opened.');
  return response.arrayBuffer();
}

function hasPdfSignature(bytes: ArrayBuffer) {
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 5));
  return String.fromCharCode(...signature) === '%PDF-';
}

export async function inspectPdf(asset: DocumentPickerAsset): Promise<InspectedPdf> {
  const fileName = asset.name.trim();
  if (!fileName.toLowerCase().endsWith('.pdf')) throw new Error('Choose a PDF file.');
  if (asset.size && asset.size > maxPdfBytes) throw new Error('Choose a PDF smaller than 25 MB.');

  const bytes = await pdfBytes(asset);
  const fileSize = bytes.byteLength;
  if (!fileSize || fileSize > maxPdfBytes) throw new Error('Choose a PDF smaller than 25 MB.');
  if (!hasPdfSignature(bytes)) throw new Error('This file is not a valid PDF.');

  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) });
  const document = await loadingTask.promise.catch(() => { throw new Error('This PDF is damaged, encrypted, or unsupported.'); });
  const pageCount = document.numPages;
  await loadingTask.destroy();
  if (pageCount < 1 || pageCount > 50000) throw new Error('This PDF has an unsupported page count.');

  return { asset, bytes, fileName: fileName.slice(0, 255), fileSize, pageCount };
}
