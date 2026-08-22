import { useLocalSearchParams } from 'expo-router';
import { ScheduleForm } from '@/components/schedule/ScheduleForm';
export default function EditScheduleScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <ScheduleForm id={id} />; }
