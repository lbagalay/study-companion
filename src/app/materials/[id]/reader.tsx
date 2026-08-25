import { useLocalSearchParams } from 'expo-router';

import { PdfReader } from '@/components/materials/PdfReader';

export default function PdfReaderScreen() {
  const { id, page } = useLocalSearchParams<{ id: string; page?: string }>();
  const requestedPage = page ? Number(page) : undefined;
  return (
    <PdfReader
      initialPage={Number.isFinite(requestedPage) ? requestedPage : undefined}
      materialId={id}
    />
  );
}
