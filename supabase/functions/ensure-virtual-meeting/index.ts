import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function loadSecret(name: string) {
  const { data, error } = await admin.rpc('integration_secret_read', { p_name: name });
  if (error || !data) throw new Error('Secure integration credentials are unavailable. Reconnect the provider.');
  return JSON.parse(String(data)) as Record<string, any>;
}

async function saveSecret(name: string, value: Record<string, any>, description: string) {
  const { error } = await admin.rpc('integration_secret_upsert', { p_name: name, p_secret: JSON.stringify(value), p_description: description });
  if (error) throw new Error(error.message);
}

async function refreshGoogle(secretName: string, token: Record<string, any>) {
  if (!token.refresh_token) throw new Error('Google refresh token missing. Reconnect Google Calendar.');
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) throw new Error('Google Calendar OAuth is not configured.');
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: token.refresh_token, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const next = await response.json();
  if (!response.ok || !next.access_token) throw new Error(next.error_description || next.error || 'Google token refresh failed.');
  const updated = { ...token, access_token: next.access_token, token_type: next.token_type || 'Bearer', expires_at: new Date(Date.now() + Math.max(Number(next.expires_in ?? 3600) - 60, 60) * 1000).toISOString() };
  await saveSecret(secretName, updated, 'TrainerHub Google Calendar OAuth token');
  return updated;
}

async function refreshZoom(secretName: string, token: Record<string, any>) {
  if (!token.refresh_token) throw new Error('Zoom refresh token missing. Reconnect Zoom.');
  const clientId = Deno.env.get('ZOOM_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) throw new Error('Zoom OAuth is not configured.');
  const url = new URL('https://zoom.us/oauth/token');
  url.searchParams.set('grant_type', 'refresh_token');
  url.searchParams.set('refresh_token', token.refresh_token);
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` } });
  const next = await response.json();
  if (!response.ok || !next.access_token) throw new Error(next.reason || next.error || 'Zoom token refresh failed.');
  const updated = { ...token, access_token: next.access_token, refresh_token: next.refresh_token || token.refresh_token, token_type: next.token_type || 'Bearer', scope: next.scope || token.scope, expires_at: new Date(Date.now() + Math.max(Number(next.expires_in ?? 3600) - 60, 60) * 1000).toISOString() };
  await saveSecret(secretName, updated, 'TrainerHub Zoom OAuth token');
  return updated;
}

async function validToken(connection: any) {
  if (!connection.credentials_ref) throw new Error('Provider credential reference missing.');
  let token = await loadSecret(connection.credentials_ref);
  const expires = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (!token.access_token || expires < Date.now() + 120_000) {
    token = connection.provider === 'zoom'
      ? await refreshZoom(connection.credentials_ref, token)
      : await refreshGoogle(connection.credentials_ref, token);
  }
  return String(token.access_token);
}

function endAt(startsAt: string, duration: number) {
  return new Date(new Date(startsAt).getTime() + duration * 60_000).toISOString();
}

async function createGoogleMeet(connection: any, booking: any) {
  const accessToken = await validToken(connection);
  const requestId = `trainerhub-${booking.id}`;
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('conferenceDataVersion', '1');
  const payload = {
    summary: 'TrainerHub Virtual Session',
    description: 'Virtual training session booked through TrainerHub.',
    start: { dateTime: booking.starts_at },
    end: { dateTime: endAt(booking.starts_at, booking.duration_min) },
    conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  };
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const event = await response.json();
  if (!response.ok || !event.id) throw new Error(event.error?.message || 'Google Meet creation failed.');
  const joinUrl = event.hangoutLink || event.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === 'video')?.uri;
  if (!joinUrl) throw new Error('Google created the event but did not return a Meet link.');

  const { data: existingLink } = await admin.from('integration_calendar_event_links').select('id').eq('integration_connection_id', connection.id).eq('booking_id', booking.id).maybeSingle();
  const linkPayload = { integration_connection_id: connection.id, booking_id: booking.id, external_calendar_id: 'primary', external_event_id: String(event.id), last_synced_at: new Date().toISOString() };
  if (existingLink?.id) await admin.from('integration_calendar_event_links').update(linkPayload).eq('id', existingLink.id);
  else await admin.from('integration_calendar_event_links').insert(linkPayload);

  return { provider: 'google_meet', url: String(joinUrl), externalId: String(event.id) };
}

async function createZoom(connection: any, booking: any) {
  const accessToken = await validToken(connection);
  const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: 'TrainerHub Virtual Session',
      type: 2,
      start_time: booking.starts_at,
      duration: booking.duration_min,
      timezone: 'UTC',
      settings: { waiting_room: true, join_before_host: false, mute_upon_entry: true },
    }),
  });
  const meeting = await response.json();
  if (!response.ok || !meeting.id || !meeting.join_url) throw new Error(meeting.message || 'Zoom meeting creation failed.');
  return { provider: 'zoom', url: String(meeting.join_url), externalId: String(meeting.id) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userResult, error: authError } = await admin.auth.getUser(token);
  const user = userResult.user;
  if (authError || !user || user.is_anonymous) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.booking_id ?? '');
  if (!bookingId) return json({ error: 'booking_id required' }, 400);

  const { data: booking, error: bookingError } = await admin.from('bookings').select('*').eq('id', bookingId).eq('trainer_id', user.id).maybeSingle();
  if (bookingError || !booking) return json({ error: 'Booking not found' }, 404);
  if (booking.status !== 'confirmed') return json({ error: 'Booking must be confirmed first' }, 409);
  if (booking.session_type !== 'virtual') return json({ skipped: true, reason: 'not_virtual' });
  if (booking.virtual_meeting_url) return json({ provider: booking.virtual_meeting_provider, join_url: booking.virtual_meeting_url, existing: true });

  const { data: connections, error: connectionError } = await admin
    .from('integration_connections')
    .select('*')
    .eq('owner_user_id', user.id)
    .eq('scope', 'personal')
    .eq('status', 'connected')
    .in('provider', ['zoom', 'google_calendar']);
  if (connectionError) return json({ error: connectionError.message }, 500);

  const zoom = (connections ?? []).find((item) => item.provider === 'zoom');
  const google = (connections ?? []).find((item) => item.provider === 'google_calendar');
  const connection = zoom || google;
  if (!connection) return json({ skipped: true, reason: 'no_virtual_provider', message: 'Connect Zoom or Google Calendar to auto-create virtual session links.' });

  try {
    const meeting = connection.provider === 'zoom' ? await createZoom(connection, booking) : await createGoogleMeet(connection, booking);
    const { error: updateError } = await admin.from('bookings').update({ virtual_meeting_provider: meeting.provider, virtual_meeting_url: meeting.url, virtual_meeting_external_id: meeting.externalId }).eq('id', booking.id);
    if (updateError) throw new Error(updateError.message);
    await admin.from('integration_sync_events').insert({ integration_connection_id: connection.id, event_type: 'virtual_meeting_created', status: 'success', summary: `${meeting.provider === 'zoom' ? 'Zoom' : 'Google Meet'} link created`, metadata: { booking_id: booking.id } });
    return json({ provider: meeting.provider, join_url: meeting.url, existing: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Virtual meeting creation failed';
    await admin.from('integration_sync_events').insert({ integration_connection_id: connection.id, event_type: 'virtual_meeting_created', status: 'failed', summary: message.slice(0, 180), metadata: { booking_id: booking.id } });
    return json({ error: message }, 500);
  }
});
