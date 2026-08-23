import { requireSupabaseClient } from '@/lib/supabase/client';
import type { NotificationStatus } from './types';

const VAPID_PUBLIC_KEY =
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function supportsWebPush() {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding =
    '='.repeat((4 - (value.length % 4)) % 4);

  const base64 = (value + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((character) =>
      character.charCodeAt(0),
    ),
  );
}

async function getRegistration() {
  if (!supportsWebPush()) {
    throw new Error(
      'Push notifications are not supported on this browser.',
    );
  }

  await navigator.serviceWorker.register('/sw.js');

  return navigator.serviceWorker.ready;
}

async function saveSubscription(
  subscription: PushSubscription,
) {
  const json = subscription.toJSON();

  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error(
      'The browser did not provide valid push encryption keys.',
    );
  }

  const supabase = requireSupabaseClient();

  const { error } = await supabase.rpc(
    'register_web_push_subscription',
    {
      p_endpoint: subscription.endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent:
        typeof navigator !== 'undefined'
          ? navigator.userAgent
          : '',
    },
  );

  if (error) {
    throw new Error(
      'Could not register this device for notifications.',
    );
  }
}

export function configureNotifications() {
  if (!supportsWebPush()) {
    return;
  }

  void navigator.serviceWorker
    .register('/sw.js')
    .catch((error) => {
      console.warn(
        'Could not register notification service worker:',
        error,
      );
    });
}

export async function requestNotificationPermission() {
  if (!supportsWebPush()) {
    return false;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error(
      'EXPO_PUBLIC_VAPID_PUBLIC_KEY is missing.',
    );

    return false;
  }

  let permission = Notification.permission;

  if (permission === 'default') {
    permission =
      await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return false;
  }

  const registration =
    await getRegistration();

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(
            VAPID_PUBLIC_KEY,
          ),
      });
  }

  await saveSubscription(subscription);

  return true;
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (!supportsWebPush()) {
    return {
      detail:
        'Push notifications are not supported on this browser.',
      permission: 'denied',
      requiresInstall: false,
      subscribed: false,
      supported: false,
    };
  }

  if (Notification.permission === 'denied') {
    return {
      detail:
        'Notifications are blocked. Enable them in your browser settings.',
      permission: 'denied',
      requiresInstall: false,
      subscribed: false,
      supported: true,
    };
  }

  if (
    Notification.permission !== 'granted'
  ) {
    return {
      detail:
        'Enable reminders to receive activity, exam, quiz, and study alerts.',
      permission: 'default',
      requiresInstall: false,
      subscribed: false,
      supported: true,
    };
  }

  try {
    const registration =
      await getRegistration();

    const subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      return {
        detail:
          'Notification permission is granted, but this device is not subscribed yet.',
        permission: 'granted',
        requiresInstall: false,
        subscribed: false,
        supported: true,
      };
    }

    return {
      detail:
        'This device is registered for Study Companion reminders.',
      permission: 'granted',
      requiresInstall: false,
      subscribed: true,
      supported: true,
    };
  } catch {
    return {
      detail:
        'Notification permission is granted, but push registration could not be checked.',
      permission: 'granted',
      requiresInstall: false,
      subscribed: false,
      supported: true,
    };
  }
}

export async function cancelNotifications(
  _ids: readonly string[],
) {
  /*
   * Web push notifications are scheduled
   * server-side, not with browser timers.
   *
   * Individual reminder cancellation is
   * controlled by the database records.
   */
}

export async function cancelAllNotifications() {
  if (!supportsWebPush()) {
    return;
  }

  const registration =
    await getRegistration();

  const subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const endpoint =
    subscription.endpoint;

  const supabase =
    requireSupabaseClient();

  const { error } = await supabase.rpc(
    'unregister_web_push_subscription',
    {
      p_endpoint: endpoint,
    },
  );

  if (error) {
    throw new Error(
      'Could not unregister this device.',
    );
  }

  await subscription.unsubscribe();
}

/*
 * These functions remain available so your
 * assignment/exam code does not break.
 *
 * Web reminders themselves are generated
 * server-side by notification_deliveries.
 */
export async function scheduleReminders(
  _title: string,
  _body: string,
  _eventAt: string,
  _offsets: readonly number[],
) {
  return [] as string[];
}

export async function scheduleExamReminders(
  _title: string,
  _eventAt: string,
  _offsets: readonly number[],
) {
  return [] as string[];
}

export type {
  NotificationStatus
} from './types';
