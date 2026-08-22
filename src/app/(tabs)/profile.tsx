import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { spacing, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import { cancelAllNotifications, requestNotificationPermission } from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services';
import type { Profile } from '@/types';

const schema = z.object({ fullName: z.string().trim().min(2, 'Enter your full name.').max(100, 'Keep your name under 100 characters.'), preferredName: z.string().trim().min(1, 'Enter your preferred name.').max(50, 'Keep your preferred name under 50 characters.'), notifications: z.boolean() }); type Values = z.infer<typeof schema>;
export default function ProfileScreen() {
  const { user } = useAuth(); const profile = useProfile(user?.id);
  if (profile.error) return <FeedbackState actionLabel="Try again" message={profile.error.message} onAction={() => void profile.refetch()} title="Could not load profile" />;
  if (profile.isLoading || !profile.data || !user) return <FeedbackState loading message="Loading your profile." title="One moment" />;
  return <ProfileEditor key={profile.data.updated_at} profile={profile.data} userId={user.id} />;
}

function ProfileEditor({ profile, userId }: { profile: Profile; userId: string }) {
  const { signOut, user } = useAuth(); const router = useRouter(); const client = useQueryClient(); const palette = useAppTheme();
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { fullName: profile.full_name, preferredName: profile.preferred_name, notifications: profile.notifications_enabled } });
  const save = useMutation({ mutationFn: async (values: Values) => { if (values.notifications) { const granted = await requestNotificationPermission(); if (!granted) throw new Error('Notification permission was not granted. You can enable it in device settings.'); } else { await cancelAllNotifications(); } return updateProfile(userId, { full_name: values.fullName.trim(), preferred_name: values.preferredName.trim(), notifications_enabled: values.notifications }); }, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['profile', userId] }); Alert.alert('Saved', 'Your preferences are up to date.'); }, onError: (e) => Alert.alert('Could not save profile', getErrorMessage(e)) });
  return <ScreenContainer><ScreenHeader description={user?.email} title="Profile" /><View style={styles.form}>
    <Controller control={control} name="fullName" render={({ field }) => <FormField error={errors.fullName?.message} label="Full name" onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="preferredName" render={({ field }) => <FormField error={errors.preferredName?.message} label="Preferred name" onChangeText={field.onChange} value={field.value} />} />
    <Controller control={control} name="notifications" render={({ field }) => <ChoiceField choices={[{ label: 'Reminders on', value: true }, { label: 'Reminders off', value: false }]} label="Notifications" onChange={field.onChange} value={field.value} />} />
    <Text style={[styles.helper, { color: palette.textMuted }]}>Appearance follows your device’s light or dark mode. Times are stored in UTC and shown in your device timezone.</Text>
    <AppButton label="Save profile" loading={save.isPending} onPress={handleSubmit((v) => save.mutate(v))} /><AppButton label="Manage subjects" onPress={() => router.push('/subjects')} variant="secondary" /><AppButton label="Sign out" onPress={() => void signOut().catch((e) => Alert.alert('Could not sign out', getErrorMessage(e)))} variant="ghost" />
  </View></ScreenContainer>;
}
const styles = StyleSheet.create({ form: { gap: spacing.md, paddingBottom: spacing.xxl }, helper: typography.body });
