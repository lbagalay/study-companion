import { useLocalSearchParams } from 'expo-router';

import { PdfReader } from '@/components/materials/PdfReader';

export default function PdfReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PdfReader materialId={id} />;
}
