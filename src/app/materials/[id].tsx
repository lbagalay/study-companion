import { useLocalSearchParams } from 'expo-router';
import { MaterialForm } from '@/components/materials/MaterialForm';
export default function MaterialDetailScreen() { const { id } = useLocalSearchParams<{ id: string }>(); return <MaterialForm id={id} />; }
