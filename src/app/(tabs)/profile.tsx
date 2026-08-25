import { zodResolver } from '@hookform/resolvers/zod';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { AppButton } from '@/components/ui/AppButton';
import { ChoiceField } from '@/components/ui/ChoiceField';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { FieldRow } from '@/components/ui/FieldRow';
import { FormField } from '@/components/ui/FormField';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { radii, spacing, typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useStudyData';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getErrorMessage } from '@/lib/errors';
import {
  cancelAllNotifications,
  getNotificationStatus,
  requestNotificationPermission,
  type NotificationStatus,
} from '@/lib/notifications';
import { useAuth } from '@/providers/AuthProvider';
import { updateProfile } from '@/services';
import type { Profile } from '@/types';

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your full name.')
    .max(100, 'Keep your name under 100 characters.'),
  preferredName: z
    .string()
    .trim()
    .min(1, 'Enter your preferred name.')
    .max(50, 'Keep your preferred name under 50 characters.'),
  notifications: z.boolean(),
});
type Values = z.infer<typeof schema>;
export default function ProfileScreen() {
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  if (profile.error)
    return (
      <FeedbackState
        actionLabel="Try again"
        message={profile.error.message}
        onAction={() => void profile.refetch()}
        title="Could not load profile"
      />
    );
  if (profile.isLoading || !profile.data || !user)
    return <FeedbackState loading message="Loading your profile." title="One moment" />;
  return <ProfileEditor key={profile.data.updated_at} profile={profile.data} userId={user.id} />;
}

function ProfileEditor({ profile, userId }: { profile: Profile; userId: string }) {
  const { signOut, user } = useAuth();
  const router = useRouter();
  const client = useQueryClient();
  const palette = useAppTheme();
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | null>(null);
  const refreshNotificationStatus = () =>
    void getNotificationStatus()
      .then(setNotificationStatus)
      .catch(() => setNotificationStatus(null));
  useEffect(refreshNotificationStatus, []);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile.full_name,
      preferredName: profile.preferred_name,
      notifications: profile.notifications_enabled,
    },
  });
  const save = useMutation({
    mutationFn: async (values: Values) => {
      if (!values.notifications) await cancelAllNotifications();
      return updateProfile(userId, {
        full_name: values.fullName.trim(),
        preferred_name: values.preferredName.trim(),
        notifications_enabled: values.notifications,
      });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile', userId] });
      refreshNotificationStatus();
      Alert.alert('Saved', 'Your preferences are up to date.');
    },
    onError: (e) => Alert.alert('Could not save profile', getErrorMessage(e)),
  });
  const enableReminders = useMutation({
    mutationFn: async () => {
      const granted = await requestNotificationPermission();
      if (!granted) throw new Error('Notification permission was not granted.');
      await updateProfile(userId, { notifications_enabled: true });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['profile', userId] });
      refreshNotificationStatus();
      Alert.alert(
        'Reminders enabled',
        'This device is ready for activity, exam, quiz, and study reminders.',
      );
    },
    onError: (e) => {
      refreshNotificationStatus();
      Alert.alert('Could not enable reminders', getErrorMessage(e));
    },
  });
  return (
    <ScreenContainer>
      <ScreenHeader description={user?.email} title="Profile" />
      <View style={styles.form}>
        <View
          style={[
            styles.notificationCard,
            { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
          ]}
        >
          <View style={[styles.notificationIcon, { backgroundColor: palette.accentSoft }]}>
            <Ionicons
              color={palette.accent}
              name={notificationStatus?.subscribed ? 'notifications' : 'notifications-outline'}
              size={24}
            />
          </View>
          <View style={styles.notificationCopy}>
            <Text style={[styles.notificationTitle, { color: palette.text }]}>
              {notificationStatus?.subscribed ? 'Reminders are ready' : 'Never miss what’s next'}
            </Text>
            <Text style={[styles.notificationDetail, { color: palette.textMuted }]}>
              {notificationStatus?.detail ?? 'Checking notification support on this device…'}
            </Text>
          </View>
          {notificationStatus?.supported &&
          !notificationStatus.subscribed &&
          !notificationStatus.requiresInstall &&
          notificationStatus.permission !== 'denied' ? (
            <AppButton
              label="Enable this device"
              loading={enableReminders.isPending}
              onPress={() => enableReminders.mutate()}
              style={styles.notificationButton}
              variant="secondary"
            />
          ) : null}
        </View>
        <FieldRow>
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <FormField
                error={errors.fullName?.message}
                label="Full name"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <Controller
            control={control}
            name="preferredName"
            render={({ field }) => (
              <FormField
                error={errors.preferredName?.message}
                label="Preferred name"
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
        </FieldRow>
        <Controller
          control={control}
          name="notifications"
          render={({ field }) => (
            <ChoiceField
              choices={[
                { label: 'Reminders on', value: true },
                { label: 'Reminders off', value: false },
              ]}
              label="Notifications"
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
        <Text style={[styles.helper, { color: palette.textMuted }]}>
          Times are stored in UTC and shown in your device timezone.
        </Text>
        <AppButton
          label="Save profile"
          loading={save.isPending}
          onPress={handleSubmit((v) => save.mutate(v))}
        />
        <AppButton
          label="Manage subjects"
          onPress={() => router.push('/subjects')}
          variant="secondary"
        />
        <AppButton
          label="Settings"
          onPress={() => router.push('/settings')}
          variant="secondary"
        />
        <AppButton
          label="Sign out"
          onPress={() =>
            void signOut().catch((e) => Alert.alert('Could not sign out', getErrorMessage(e)))
          }
          variant="ghost"
        />
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingBottom: spacing.xxl },
  helper: typography.body,
  notificationCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  notificationIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  notificationCopy: { gap: spacing.xs },
  notificationTitle: typography.sectionTitle,
  notificationDetail: typography.body,
  notificationButton: { alignSelf: 'flex-start' },
});
