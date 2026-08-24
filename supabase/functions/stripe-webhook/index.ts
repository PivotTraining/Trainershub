/**
 * stripe-webhook
 *
 * Handles Stripe webhook events:
 *   - payment_intent.succeeded  → marks booking payment_status = 'paid'
 *   - payment_intent.payment_failed → marks booking payment_status = 'failed'
 *   - charge.refunded → marks a fully refunded booking as refunded
 *   - account.updated → updates stripe_onboarded flag on trainer_profiles
 *
 * Conversion events that depend on Stripe confirmation are written here,
 * server-side, so marketing analytics reflects trusted payment state rather
 * than a client-side success screen.
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
    const updateBookingPayment = async (
      paymentIntentId: string,
      paymentStatus: 'paid' | 'failed' | 'refunded',
    ) => {
      const { data: current, error: currentError } = await supabase
        .from('bookings')
        .select('id, client_id, trainer_id, payment_status')
        .eq('payment_intent_id', paymentIntentId)
        .maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error(`No booking found for PaymentIntent ${paymentIntentId}`);

      const changed = current.payment_status !== paymentStatus;
      if (changed) {
        const { error } = await supabase
          .from('bookings')
          .update({ payment_status: paymentStatus })
          .eq('id', current.id);
        if (error) throw new Error(error.message);
      }

      return { ...current, changed };
    };

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const booking = await updateBookingPayment(pi.id, 'paid');
        if (booking.changed) {
          const { error } = await supabase.from('product_events').insert({
            user_id: booking.client_id,
            event_name: 'payment_completed',
            properties: {
              booking_id: booking.id,
              trainer_id: booking.trainer_id,
              payment_intent_id: pi.id,
              amount_cents: pi.amount_received,
              currency: pi.currency,
              source: 'stripe_webhook',
            },
          });
          if (error) throw new Error(error.message);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await updateBookingPayment(pi.id, 'failed');
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;
        if (paymentIntentId && charge.amount_refunded >= charge.amount) {
          await updateBookingPayment(paymentIntentId, 'refunded');
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const onboarded = account.details_submitted === true && account.charges_enabled === true;

        const { data: trainer, error: trainerError } = await supabase
          .from('trainer_profiles')
          .select('user_id, stripe_onboarded')
          .eq('stripe_account_id', account.id)
          .maybeSingle();
        if (trainerError) throw new Error(trainerError.message);

        if (trainer) {
          const becameConnected = onboarded && !trainer.stripe_onboarded;
          const { error } = await supabase
            .from('trainer_profiles')
            .update({ stripe_onboarded: onboarded })
            .eq('user_id', trainer.user_id);
          if (error) throw new Error(error.message);

          if (becameConnected) {
            const { error: eventError } = await supabase.from('product_events').insert({
              user_id: trainer.user_id,
              event_name: 'stripe_connected',
              properties: { stripe_account_id: account.id, source: 'stripe_webhook' },
            });
            if (eventError) throw new Error(eventError.message);
          }
        }
        break;
      }

      default:
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
