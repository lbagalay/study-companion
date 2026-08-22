import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

type Delivery = {
  id: string;
  user_id: string;
  source_type: 'ASSIGNMENT' | 'EXAM' | 'SESSION';
  source_id: string;
  reminder_offset: number;
  scheduled_for: string;
  title: string;
  body: string;
  target_path: string;
};

type Subscription = { endpoint: string; p256dh: string; auth: string };

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function serviceKey() {
  const direct = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (direct) return direct;
  const dictionary = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  if (!dictionary.default) throw new Error('Missing Supabase secret key');
  return dictionary.default;
}

function authorized(req: Request) {
  const expected = required('REMINDER_CRON_SECRET');
  return req.headers.get('authorization') === `Bearer ${expected}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : 'Unknown Web Push error';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(required('SUPABASE_URL'), serviceKey(), { auth: { autoRefreshToken: false, persistSession: false } });
  const vapidDetails = {
    subject: required('VAPID_SUBJECT'),
    publicKey: required('VAPID_PUBLIC_KEY'),
    privateKey: required('VAPID_PRIVATE_KEY'),
  };
  const { data, error } = await supabase.rpc('claim_due_web_notifications', { p_limit: 100 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let delivered = 0;
  let failed = 0;
  for (const delivery of (data ?? []) as Delivery[]) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('web_push_subscriptions')
      .select('endpoint,p256dh,auth')
      .eq('user_id', delivery.user_id);

    let successes = 0;
    const failures: string[] = [];
    if (subscriptionError) failures.push(subscriptionError.message);
    for (const subscription of (subscriptions ?? []) as Subscription[]) {
      try {
        await webPush.sendNotification({ endpoint: subscription.endpoint, keys: { auth: subscription.auth, p256dh: subscription.p256dh } }, JSON.stringify({
          body: delivery.body,
          tag: `${delivery.source_type.toLowerCase()}-${delivery.source_id}-${delivery.reminder_offset}`,
          title: delivery.title,
          url: delivery.target_path,
        }), { TTL: 86400, urgency: 'high', vapidDetails });
        successes += 1;
      } catch (pushError) {
        const statusCode = (pushError as { statusCode?: number }).statusCode;
        failures.push(errorMessage(pushError));
        if (statusCode === 404 || statusCode === 410) await supabase.from('web_push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      }
    }

    const completed = successes > 0;
    await supabase.from('notification_deliveries').update({
      delivered_at: completed ? new Date().toISOString() : null,
      error: completed ? null : (failures.join(' | ') || 'No active push subscriptions').slice(0, 1000),
      status: completed ? 'DELIVERED' : 'FAILED',
    }).eq('id', delivery.id);
    if (completed) delivered += 1; else failed += 1;
  }

  return Response.json({ claimed: data?.length ?? 0, delivered, failed });
});
