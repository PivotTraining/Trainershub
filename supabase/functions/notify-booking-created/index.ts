import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('authorization') ?? '';
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { authorization } } },
    );

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const bookingId = String(body.bookingId ?? '').trim();
    if (!bookingId) return json({ error: 'bookingId is required' }, 400);

    // The caller-scoped client keeps this authorization check subject to RLS.
    const { data: booking, error: bookingError } = await callerClient
      .from('bookings')
      .select('id, client_id, trainer_id, starts_at, status')
      .eq('id', bookingId)
      .eq('client_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (bookingError) throw new Error(bookingError.message);
    if (!booking) return json({ error: 'Booking not found' }, 404);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: trainer, error: trainerError } = await adminClient
      .from('profiles')
      .select('expo_push_token')
      .eq('id', booking.trainer_id)
      .maybeSingle<{ expo_push_token: string | null }>();

    if (trainerError) throw new Error(trainerError.message);
    if (!trainer?.expo_push_token) return json({ delivered: false, reason: 'no_token' });

    const startsLabel = new Date(booking.starts_at).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: trainer.expo_push_token,
        title: 'New booking request',
        body: `You have a new session request for ${startsLabel}`,
        data: { bookingId: booking.id },
      }),
    });

    if (!pushResponse.ok) {
      const detail = await pushResponse.text().catch(() => pushResponse.statusText);
      throw new Error(`Expo push request failed (${pushResponse.status}): ${detail}`);
    }

    return json({ delivered: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
