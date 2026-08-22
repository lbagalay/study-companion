import type { DocumentPickerAsset } from 'expo-document-picker';

import type { InspectedPdf } from '@/lib/pdf/types';

export async function inspectPdf(_asset: DocumentPickerAsset): Promise<InspectedPdf> {
  throw new Error('The in-app PDF reader is currently available in the Study Companion PWA.');
}
