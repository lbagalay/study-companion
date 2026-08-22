import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { SubjectField } from '@/components/forms/SubjectField';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing, typography } from '@/constants/theme';
import { keys, useSubjects } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { inspectPdf } from '@/lib/pdf/document';
import type { InspectedPdf } from '@/lib/pdf/types';
import { deleteMaterial, getMaterial, getMaterialUrl, saveMaterial, savePdfMaterial, uploadMaterialFile } from '@/services';
import type { MaterialType } from '@/types';

const materialTypes: { label: string; value: MaterialType }[] = ['PDF', 'IMAGE', 'DOCUMENT', 'LINK', 'VIDEO_LINK', 'NOTE', 'OTHER'].map((v) => ({ label: v.replace('_', ' '), value: v as MaterialType }));
const schema = z.object({ subject_id: z.string().min(1, 'Choose a subject.'), title: z.string().trim().min(1, 'Enter a material title.').max(150, 'Keep the title under 150 characters.'), description: z.string().trim().max(3000, 'Keep the description under 3,000 characters.'), type: z.enum(['PDF', 'IMAGE', 'DOCUMENT', 'LINK', 'VIDEO_LINK', 'NOTE', 'OTHER']), external_url: z.string(), favorite: z.boolean(), completed: z.boolean() }).refine((v) => !['LINK', 'VIDEO_LINK'].includes(v.type) || z.url().safeParse(v.external_url).success, { path: ['external_url'], message: 'Enter a valid URL.' });
type Values = z.infer<typeof schema>;

export function MaterialForm({ id }: { id?: string }) {
  const router = useRouter(); const client = useQueryClient(); const palette = useAppTheme(); const subjects = useSubjects(); const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null); const [inspectedPdf, setInspectedPdf] = useState<InspectedPdf | null>(null); const [inspecting, setInspecting] = useState(false);
  const item = useQuery({ queryKey: ['material', id], queryFn: () => getMaterial(id!), enabled: Boolean(id) });
  const { control, getValues, handleSubmit, reset, setValue, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { subject_id: '', title: '', description: '', type: 'PDF', external_url: '', favorite: false, completed: false } });
  const type = useWatch({ control, name: 'type' });
  useEffect(() => { if (!id && subjects.data?.[0]) reset((v) => ({ ...v, subject_id: v.subject_id || subjects.data![0].id })); }, [id, reset, subjects.data]);
  useEffect(() => { if (item.data) reset({ subject_id: item.data.subject_id, title: item.data.title, description: item.data.description, type: item.data.type, external_url: item.data.external_url ?? '', favorite: item.data.favorite, completed: item.data.completed }); }, [item.data, reset]);
  const save = useMutation({
    mutationFn: async (v: Values) => {
      if (v.type === 'PDF') {
        if (inspectedPdf) return savePdfMaterial({ completed: v.completed, description: v.description, favorite: v.favorite, subject_id: v.subject_id, title: v.title }, inspectedPdf, id, item.data?.file_url);
        if (!id || item.data?.type !== 'PDF' || !item.data.file_url) throw new Error('Choose a PDF before uploading.');
        return saveMaterial({ completed: v.completed, description: v.description, favorite: v.favorite, subject_id: v.subject_id, title: v.title, type: 'PDF' }, id);
      }
      let fileUrl = item.data?.file_url ?? null;
      if (asset) fileUrl = await uploadMaterialFile(v.subject_id, asset);
      if (!fileUrl && !v.external_url && v.type !== 'NOTE') throw new Error('Choose a file or enter a link.');
      return saveMaterial({ ...v, external_url: v.external_url || null, file_url: fileUrl }, id);
    },
    onSuccess: async (material) => {
      await client.invalidateQueries({ queryKey: keys.materials });
      if (!material) return;
      if (material.type === 'PDF') router.replace(`/materials/${material.id}/reader` as never);
      else router.back();
    },
    onError: (e) => Alert.alert('Could not save material', getErrorMessage(e)),
  });
  const remove = useMutation({ mutationFn: () => deleteMaterial(id!, item.data?.file_url), onSuccess: async () => { await client.invalidateQueries({ queryKey: keys.materials }); router.back(); }, onError: (e) => Alert.alert('Could not delete material', getErrorMessage(e)) });
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: type === 'PDF' ? 'application/pdf' : '*/*' });
    if (result.canceled) return;
    const selected = result.assets[0];
    try {
      setInspecting(type === 'PDF');
      const pdf = type === 'PDF' ? await inspectPdf(selected) : null;
      setAsset(selected);
      setInspectedPdf(pdf);
      if (pdf && !getValues('title').trim()) setValue('title', pdf.fileName.replace(/\.pdf$/i, ''));
    } catch (error) {
      setAsset(null);
      setInspectedPdf(null);
      Alert.alert('Could not use this PDF', getErrorMessage(error));
    } finally {
      setInspecting(false);
    }
  };
  if (id && item.error) return <FeedbackState actionLabel="Try again" message={item.error.message} onAction={() => void item.refetch()} title="Could not load material" />;
  if (id && item.isLoading) return <FeedbackState loading message="Loading material." title="One moment" />;
  return <ScreenContainer><ScreenHeader back description="Files stay in a private, user-scoped bucket." title={id ? 'Material details' : 'Add material'} /><View style={styles.form}>
    <Controller control={control} name="subject_id" render={({ field }) => <SubjectField onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="title" render={({ field }) => <FormField error={errors.title?.message} label="Title" onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="type" render={({ field }) => <ChoiceField choices={materialTypes} label="Type" onChange={(value) => { field.onChange(value); setAsset(null); setInspectedPdf(null); }} value={field.value} />} />
    {['LINK', 'VIDEO_LINK'].includes(type) ? <Controller control={control} name="external_url" render={({ field }) => <FormField autoCapitalize="none" error={errors.external_url?.message} keyboardType="url" label="URL" onChangeText={field.onChange} value={field.value} />} /> : type !== 'NOTE' ? <><AppButton label={inspecting ? 'Checking PDF' : asset ? 'Choose a different file' : type === 'PDF' ? 'Choose PDF' : 'Choose file'} loading={inspecting} onPress={() => void pick()} variant="secondary" />{inspectedPdf ? <Text style={[styles.file, { color: palette.textMuted }]}>{inspectedPdf.fileName} · {inspectedPdf.pageCount} pages · {formatFileSize(inspectedPdf.fileSize)}</Text> : asset ? <Text style={[styles.file, { color: palette.textMuted }]}>{asset.name}</Text> : item.data?.file_url ? <Text style={[styles.file, { color: palette.textMuted }]}>{item.data.file_name ? `${item.data.file_name}${item.data.page_count ? ` · ${item.data.page_count} pages` : ''}` : 'Existing upload will be kept.'}</Text> : null}</> : null}
    <Controller control={control} name="description" render={({ field }) => <FormField label={type === 'NOTE' ? 'Content' : 'Description'} multiline onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="favorite" render={({ field }) => <ChoiceField choices={[{ label: 'Standard', value: false }, { label: 'Favorite', value: true }]} label="Favorite" onChange={field.onChange} value={field.value} />} />
    <Controller control={control} name="completed" render={({ field }) => <ChoiceField choices={[{ label: 'To review', value: false }, { label: 'Completed', value: true }]} label="Progress" onChange={field.onChange} value={field.value} />} />
    <AppButton label={type === 'PDF' ? id ? 'Save and open PDF' : 'Upload and open PDF' : id ? 'Save changes' : 'Add material'} loading={save.isPending} onPress={handleSubmit((v) => save.mutate(v))} />
    {id && (item.data?.file_url || item.data?.external_url) ? <AppButton label={item.data.type === 'PDF' ? 'Open PDF reader' : 'Open material'} onPress={() => item.data?.type === 'PDF' ? router.push(`/materials/${id}/reader` as never) : void (async () => { try { const url = item.data?.file_url ? await getMaterialUrl(item.data.file_url) : item.data?.external_url; if (url) await Linking.openURL(url); } catch (error) { Alert.alert('Could not open material', getErrorMessage(error)); } })()} variant="secondary" /> : null}
    {id ? <AppButton label="Delete material" loading={remove.isPending} onPress={() => Alert.alert('Delete material?', 'The stored file will also be removed.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() }])} variant="danger" /> : null}
  </View></ScreenContainer>;
}
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl }, file: typography.body });
