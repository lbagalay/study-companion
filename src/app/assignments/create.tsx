import { useLocalSearchParams } from 'expo-router';

import { AssignmentForm } from '@/components/assignments/AssignmentForm';

export default function CreateAssignmentScreen() {
  const { title, dueAt, notes } = useLocalSearchParams<{
    title?: string;
    dueAt?: string;
    notes?: string;
  }>();

  return <AssignmentForm initialDueAt={dueAt} initialNotes={notes} initialTitle={title} />;
}
