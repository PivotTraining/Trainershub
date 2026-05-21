/**
 * create-payment-intent
 *
 * Creates a Stripe PaymentIntent for a confirmed booking and returns the
 * clientSecret for the native PaymentSheet.
 *
 * Body: { booking_id: string }
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PLATFORM_FEE_PERCENT   (optional, defaults to 4)
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

const PLATFORM_FEE_PERCENT = parseFloat(Deno.env.get('PLATFORM_FEE_PERCENT') ?? '4');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface BookingForPayment {
  id: string;
  trainer_id: string;
  client_id: string;
  duration_min: number;
  status: string;
  payment_intent_id: string | null;
  payment_status: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let bookingId: string;
  try {
    const body = await req.json() as { booking_id?: string };
    if (!body.booking_id) throw new Error('booking_id required');
    bookingId = body.booking_id;
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  try {
    // Load booking first. Trainer profile is fetched separately because both
    // bookings.trainer_id and trainer_profiles.user_id point at profiles(id);
    // there is no direct FK relationship for a reliable embedded Supabase join.
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('client_id', user.id)
      .single<BookingForPayment>();

    if (bookingError || !booking) {
      return json({ error: 'Booking not found' }, 404);
    }

    if (booking.status !== 'confirmed') {
      return json({ error: 'Payment is only available for confirmed bookings' }, 400);
    }

    if (booking.payment_status === 'paid') {
      return json({ error: 'Booking has already been paid' }, 400);
    }

    if (booking.payment_intent_id) {
      // Already has a payment intent — retrieve and return
      const existing = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
      return json({ client_secret: existing.client_secret });
    }

    const { data: trainerProfile, error: trainerError } = await supabase
      .from('trainer_profiles')
      .select('hourly_rate_cents, stripe_account_id')
      .eq('user_id', booking.trainer_id)
      .single<{
        hourly_rate_cents: number | null;
        stripe_account_id: string | null;
      }>();

    if (trainerError || !trainerProfile) {
      return json({ error: 'Trainer payment profile not found' }, 400);
    }

    if (!trainerProfile?.stripe_account_id) {
      return json({ error: 'Trainer has not connected a payment account yet' }, 400);
    }

    const rateCents = trainerProfile.hourly_rate_cents ?? 0;
    const amountCents = Math.round(rateCents * (booking.duration_min / 60));
    if (amountCents < 50) {
      return json({ error: 'Amount too small for payment processing' }, 400);
    }

    const feeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: feeCents,
      transfer_data: { destination: trainerProfile.stripe_account_id },
      metadata: {
        booking_id: bookingId,
        client_id: user.id,
        trainer_id: booking.trainer_id,
      },
    });

    // Persist payment_intent_id on booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', bookingId);
    if (updateError) throw new Error(updateError.message);

    return json({ client_secret: paymentIntent.client_secret });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
