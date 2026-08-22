import { useLocalSearchParams } from 'expo-router';
import { SubjectForm } from '@/components/subjects/SubjectForm';
export default function SubjectDetailScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <SubjectForm id={id} />; }
