import { useLocalSearchParams } from 'expo-router';
import { NoteForm } from '@/components/notes/NoteForm';
export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoteForm id={id} />;
}
