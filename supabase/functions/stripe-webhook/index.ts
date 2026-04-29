/**
 * stripe-webhook
 *
 * Handles Stripe webhook events:
 *   - payment_intent.succeeded  → marks booking payment_status = 'paid'
 *   - payment_intent.payment_failed → marks booking payment_status = 'failed'
 *   - account.updated → updates stripe_onboarded flag on trainer_profiles
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   (from Stripe Dashboard → Webhooks → Signing secret)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'paid' })
            .eq('id', bookingId);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'failed' })
            .eq('id', bookingId);
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const onboarded =
          account.details_submitted === true &&
          account.charges_enabled === true;
        // Find trainer by stripe_account_id
        await supabase
          .from('trainer_profiles')
          .update({ stripe_onboarded: onboarded })
          .eq('stripe_account_id', account.id);
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Handler error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
