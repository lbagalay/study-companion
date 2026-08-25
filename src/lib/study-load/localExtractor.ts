import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';

import { parseStudyLoadText } from '@/lib/study-load/parser';
import type { StudyLoadExtraction } from '@/lib/study-load/schema';

export type StudyLoadProgress = { progress: number; status: string };

function readableStatus(status: string) {
  if (status.includes('loading language')) return 'Loading the offline English reader';
  if (status.includes('initializing')) return 'Preparing the document reader';
  if (status.includes('recognizing')) return 'Reading the study-load table';
  return 'Preparing your study load';
}

async function assetBlob(asset: DocumentPickerAsset) {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('The selected image could not be opened.');
  return response.blob();
}

export async function extractStudyLoadLocally(
  asset: DocumentPickerAsset,
  onProgress?: (progress: StudyLoadProgress) => void,
): Promise<StudyLoadExtraction> {
  if (Platform.OS !== 'web')
    throw new Error('Free study-load reading is currently available in the PWA.');
  if (asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf')) {
    throw new Error(
      'For free importing, save the study-load page as a screenshot and upload the image.',
    );
  }

  const { createWorker, OEM, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    logger: (message) =>
      onProgress?.({
        progress: Math.round(message.progress * 100),
        status: readableStatus(message.status),
      }),
  });

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: PSM.AUTO,
      user_defined_dpi: '300',
    });
    const result = await worker.recognize(await assetBlob(asset));
    onProgress?.({ progress: 100, status: 'Building editable subject cards' });
    return parseStudyLoadText(result.data.text);
  } finally {
    await worker.terminate();
  }
}
