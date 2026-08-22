import { useQuery } from '@tanstack/react-query';
import { Alert, Linking } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getErrorMessage } from '@/lib/errors';
import { getMaterial, getMaterialUrl } from '@/services';

export function PdfReader({ materialId }: { materialId: string }) {
  const material = useQuery({ queryKey: ['material', materialId], queryFn: () => getMaterial(materialId), enabled: Boolean(materialId) });
  if (material.isLoading) return <FeedbackState loading message="Checking your private material." title="Opening PDF" />;
  if (material.error) return <FeedbackState actionLabel="Try again" message={getErrorMessage(material.error)} onAction={() => void material.refetch()} title="Could not load this PDF" />;
  if (!material.data?.file_url || material.data.type !== 'PDF') return <FeedbackState message="This material is not a stored PDF." title="PDF unavailable" />;
  return <ScreenContainer><ScreenHeader back description="Page tracking is currently available in the installed PWA." title={material.data.title} /><AppButton label="Open in system PDF viewer" onPress={() => void (async () => { try { await Linking.openURL(await getMaterialUrl(material.data!.file_url!, 3600)); } catch (error) { Alert.alert('Could not open PDF', getErrorMessage(error)); } })()} /></ScreenContainer>;
}
