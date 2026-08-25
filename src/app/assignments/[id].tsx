import { useLocalSearchParams } from 'expo-router';
import { AssignmentForm } from '@/components/assignments/AssignmentForm';
export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AssignmentForm id={id} />;
}
