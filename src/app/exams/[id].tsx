import { useLocalSearchParams } from 'expo-router';
import { ExamForm } from '@/components/exams/ExamForm';
export default function ExamDetailScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <ExamForm id={id} />; }
