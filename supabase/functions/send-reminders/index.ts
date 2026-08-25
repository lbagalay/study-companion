import { createClient } from 'npm:@supabase/supabase-js@2';

// @deno-types="npm:@types/web-push@3.6.4"
import webPush from 'npm:web-push@3.6.7';

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

type Subscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function required(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function serviceKey() {
  const direct = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (direct) {
    return direct;
  }

  const dictionary = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<
    string,
    string
  >;

  if (!dictionary.default) {
    throw new Error('Missing Supabase secret key');
  }

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
  if (req.method !== 'POST') {
    return Response.json(
      {
        error: 'Method not allowed',
      },
      {
        status: 405,
      },
    );
  }

  if (!authorized(req)) {
    return Response.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    );
  }

  try {
    const supabase = createClient(required('SUPABASE_URL'), serviceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const vapidDetails = {
      subject: required('VAPID_SUBJECT'),
      publicKey: required('VAPID_PUBLIC_KEY'),
      privateKey: required('VAPID_PRIVATE_KEY'),
    };

    /*
     * Finds reminder deliveries that are due now
     * and marks them PROCESSING.
     */
    const { data, error } = await supabase.rpc('claim_due_web_notifications', {
      p_limit: 100,
    });

    if (error) {
      console.error('Could not claim notifications:', error);

      return Response.json(
        {
          error: error.message,
        },
        {
          status: 500,
        },
      );
    }

    const deliveries = (data ?? []) as Delivery[];

    let delivered = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      /*
       * Get every device/browser registered
       * to this user.
       */
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('web_push_subscriptions')
        .select('endpoint,p256dh,auth')
        .eq('user_id', delivery.user_id);

      let successes = 0;

      const failures: string[] = [];

      if (subscriptionError) {
        failures.push(subscriptionError.message);
      }

      for (const subscription of (subscriptions ?? []) as Subscription[]) {
        try {
          const payload = JSON.stringify({
            title: delivery.title,
            body: delivery.body,

            url: delivery.target_path,

            tag:
              `${delivery.source_type.toLowerCase()}-` +
              `${delivery.source_id}-` +
              `${delivery.reminder_offset}`,
          });

          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,

              keys: {
                auth: subscription.auth,

                p256dh: subscription.p256dh,
              },
            },
            payload,
            {
              TTL: 86400,
              urgency: 'high',
              vapidDetails,
            },
          );

          successes += 1;
        } catch (pushError) {
          const statusCode = (
            pushError as {
              statusCode?: number;
            }
          ).statusCode;

          const message = errorMessage(pushError);

          console.error('Push failed:', statusCode, message);

          failures.push(message);

          /*
           * 404/410 means the subscription is
           * no longer valid.
           *
           * Remove it so we do not keep trying
           * to send to a dead browser/device.
           */
          if (statusCode === 404 || statusCode === 410) {
            await supabase
              .from('web_push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
          }
        }
      }

      const completed = successes > 0;

      /*
       * Mark notification as delivered/failed.
       */
      const { error: updateError } = await supabase
        .from('notification_deliveries')
        .update({
          delivered_at: completed ? new Date().toISOString() : null,

          error: completed
            ? null
            : (failures.join(' | ') || 'No active push subscriptions').slice(0, 1000),

          status: completed ? 'DELIVERED' : 'FAILED',
        })
        .eq('id', delivery.id);

      if (updateError) {
        console.error('Could not update delivery:', updateError);
      }

      if (completed) {
        delivered += 1;
      } else {
        failed += 1;
      }
    }

    return Response.json({
      claimed: deliveries.length,
      delivered,
      failed,
    });
  } catch (error) {
    console.error('send-reminders failed:', error);

    return Response.json(
      {
        error: errorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
});
