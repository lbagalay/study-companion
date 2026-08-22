import type { DocumentPickerAsset } from 'expo-document-picker';

export const maxPdfBytes = 25 * 1024 * 1024;

export type InspectedPdf = {
  asset: DocumentPickerAsset;
  bytes: ArrayBuffer;
  fileName: string;
  fileSize: number;
  pageCount: number;
};
