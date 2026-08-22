// Web implementation. Metro selects reminders.native.ts on iOS and Android.
import { env } from '@/lib/env';
import { requireSupabaseClient } from '@/lib/supabase/client';
import type { NotificationStatus } from './types';

let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

function isBrowser() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined';
}

function supportsWebPush() {
  return isBrowser() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function isIosBrowser() {
  if (!isBrowser()) return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (!isBrowser()) return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function serviceWorkerRegistration() {
  if (!supportsWebPush()) throw new Error('This browser does not support push notifications.');
  registrationPromise ??= navigator.serviceWorker.register('/sw.js');
  return registrationPromise;
}

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function configureNotifications() {
  if (!isBrowser() || !('serviceWorker' in navigator)) return;
  const register = () => { void serviceWorkerRegistration().catch(() => undefined); };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (!supportsWebPush()) return { detail: 'Push notifications are not supported in this browser.', permission: 'unsupported', requiresInstall: false, subscribed: false, supported: false };
  const requiresInstall = isIosBrowser() && !isStandalone();
  const permission = Notification.permission;
  let subscribed = false;
  if (permission === 'granted' && !requiresInstall) {
    const registration = await serviceWorkerRegistration();
    subscribed = Boolean(await registration.pushManager.getSubscription());
  }
  const detail = requiresInstall
    ? 'On iPhone, add Study Companion to your Home Screen before enabling reminders.'
    : permission === 'denied'
      ? 'Notifications are blocked. Allow them in your browser or site settings.'
      : subscribed
        ? 'This device will receive activity, exam, quiz, and study reminders.'
        : 'Enable reminders to receive alerts even when Study Companion is closed.';
  return { detail, permission, requiresInstall, subscribed, supported: true };
}

export async function requestNotificationPermission() {
  if (!supportsWebPush()) throw new Error('This browser does not support push notifications.');
  if (isIosBrowser() && !isStandalone()) throw new Error('Add Study Companion to your iPhone Home Screen first, then open the installed app and enable reminders.');
  if (!env.vapidPublicKey || env.vapidPublicKey.includes('your-vapid')) throw new Error('Web Push is not configured yet. Add EXPO_PUBLIC_VAPID_PUBLIC_KEY to the deployment environment.');

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await serviceWorkerRegistration();
  const current = await registration.pushManager.getSubscription();
  const subscription = current ?? await registration.pushManager.subscribe({ applicationServerKey: applicationServerKey(env.vapidPublicKey), userVisibleOnly: true });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('The browser returned an incomplete push subscription.');

  const { error } = await requireSupabaseClient().rpc('register_web_push_subscription', {
    p_auth: json.keys.auth,
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_user_agent: navigator.userAgent.slice(0, 500),
  });
  if (error) throw new Error('Could not save this device for reminders. Apply the Web Push database migration and try again.');
  return true;
}

export async function cancelNotifications(_ids: readonly string[]) {
  // Web reminders are derived from database due dates, so there are no local IDs to cancel.
}

export async function cancelAllNotifications() {
  if (!supportsWebPush()) return;
  const registration = await serviceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await requireSupabaseClient().rpc('unregister_web_push_subscription', { p_endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

export async function scheduleReminders(_title: string, _body: string, _eventAt: string, _offsets: readonly number[]) {
  // The Supabase reminder dispatcher schedules Web Push reliably while the PWA is closed.
  return [] as string[];
}

export async function scheduleExamReminders(_title: string, _eventAt: string, _offsets: readonly number[]) {
  return [] as string[];
}

export type { NotificationStatus } from './types';
