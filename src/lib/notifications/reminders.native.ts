import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { requireSupabaseClient } from '@/lib/supabase/client';
import type { NotificationStatus } from './types';

let configured = false;
export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android')
    void Notifications.setNotificationChannelAsync('reminders', {
      name: 'Study reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  const permission = await Notifications.getPermissionsAsync();
  return {
    detail: permission.granted
      ? 'This device will receive scheduled reminders.'
      : 'Enable reminders to receive activity, exam, quiz, and study alerts.',
    permission: permission.granted ? 'granted' : permission.canAskAgain ? 'default' : 'denied',
    requiresInstall: false,
    subscribed: permission.granted,
    supported: true,
  };
}

export async function cancelNotifications(ids: readonly string[]) {
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReminders(
  title: string,
  body: string,
  eventAt: string,
  offsets: readonly number[],
) {
  const supabase = requireSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];
  const { data: profile } = await supabase
    .from('profiles')
    .select('notifications_enabled')
    .eq('id', userData.user.id)
    .single();
  if (profile && !profile.notifications_enabled) return [];
  if (!(await requestNotificationPermission())) return [];
  const eventDate = new Date(eventAt);
  const now = Date.now();
  const ids: string[] = [];
  for (const minutes of offsets) {
    const date = new Date(eventDate.getTime() - minutes * 60_000);
    if (date.getTime() <= now) continue;
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: 'reminders',
        },
      }),
    );
  }
  return ids;
}

export async function scheduleExamReminders(
  title: string,
  eventAt: string,
  offsets: readonly number[],
) {
  const ids = await scheduleReminders(
    title,
    'Your exam is coming up. Open Study Companion to review your plan.',
    eventAt,
    offsets,
  );
  if (!(await requestNotificationPermission())) return ids;
  const exam = new Date(eventAt);
  const morning = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate(), 8, 0);
  if (morning.getTime() > Date.now() && morning < exam)
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { title, body: 'Today is exam day. You’ve prepared for this.' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: morning,
          channelId: 'reminders',
        },
      }),
    );
  return ids;
}

export type { NotificationStatus } from './types';
