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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let bookingId: string;
  try {
    const body = await req.json() as { booking_id?: string };
    if (!body.booking_id) throw new Error('booking_id required');
    bookingId = body.booking_id;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Load booking + trainer profile
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, trainer_profiles!trainer_id(hourly_rate_cents, stripe_account_id)')
      .eq('id', bookingId)
      .eq('client_id', user.id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (booking.status !== 'confirmed') {
      return new Response(
        JSON.stringify({ error: 'Payment is only available for confirmed bookings' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (booking.payment_intent_id) {
      // Already has a payment intent — retrieve and return
      const existing = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
      return new Response(
        JSON.stringify({ client_secret: existing.client_secret }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
      );
    }

    const trainerProfile = booking.trainer_profiles as {
      hourly_rate_cents: number | null;
      stripe_account_id: string | null;
    };

    if (!trainerProfile?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Trainer has not connected a payment account yet' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const rateCents = trainerProfile.hourly_rate_cents ?? 0;
    const amountCents = Math.round(rateCents * (booking.duration_min / 60));
    if (amountCents < 50) {
      return new Response(JSON.stringify({ error: 'Amount too small for payment processing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
    await supabase
      .from('bookings')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', bookingId);

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
