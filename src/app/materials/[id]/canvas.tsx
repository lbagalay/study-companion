import { useLocalSearchParams } from 'expo-router';

import { CanvasNoteEditor } from '@/components/materials/CanvasNoteEditor';

export default function CanvasNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CanvasNoteEditor materialId={id} />;
}
