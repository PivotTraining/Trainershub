import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type TokenRecord = {
  provider: string;
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
  scope?: string | null;
  expires_at?: string | null;
};

async function refreshToken(provider: string, token: TokenRecord): Promise<TokenRecord> {
  if (!token.refresh_token) throw new Error('Calendar refresh token is missing. Reconnect the integration.');
  const isGoogle = provider === 'google_calendar';
  const clientId = isGoogle ? Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') : Deno.env.get('MICROSOFT_CALENDAR_CLIENT_ID');
  const clientSecret = isGoogle ? Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') : Deno.env.get('MICROSOFT_CALENDAR_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Provider OAuth credentials are not configured.');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  });
  let endpoint: string;
  if (isGoogle) {
    endpoint = 'https://oauth2.googleapis.com/token';
  } else {
    const tenant = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
    endpoint = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    body.set('scope', 'offline_access User.Read Calendars.ReadWrite');
  }

  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const next = await response.json();
  if (!response.ok || !next.access_token) throw new Error(next.error_description || next.error || 'Token refresh failed.');
  const expiresIn = Number(next.expires_in ?? 3600);
  return {
    ...token,
    access_token: next.access_token,
    refresh_token: next.refresh_token || token.refresh_token,
    token_type: next.token_type || token.token_type || 'Bearer',
    scope: next.scope || token.scope || null,
    expires_at: new Date(Date.now() + Math.max(expiresIn - 60, 60) * 1000).toISOString(),
  };
}

async function loadAccessToken(connection: { provider: string; credentials_ref: string | null }) {
  if (!connection.credentials_ref) throw new Error('Secure provider credentials are missing. Reconnect the integration.');
  const { data: secret, error } = await admin.rpc('integration_secret_read', { p_name: connection.credentials_ref });
  if (error || !secret) throw new Error('Secure provider credentials could not be loaded.');
  let token = JSON.parse(String(secret)) as TokenRecord;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (!token.access_token || expiresAt < Date.now() + 120_000) {
    token = await refreshToken(connection.provider, token);
    const { error: vaultError } = await admin.rpc('integration_secret_upsert', {
      p_name: connection.credentials_ref,
      p_secret: JSON.stringify(token),
      p_description: `TrainerHub ${connection.provider} OAuth token`,
    });
    if (vaultError) throw new Error(vaultError.message);
  }
  return token.access_token;
}

function endTime(startsAt: string, durationMin: number) {
  return new Date(new Date(startsAt).getTime() + durationMin * 60_000).toISOString();
}

async function syncGoogle(accessToken: string, booking: any, externalEventId?: string | null) {
  const event = {
    summary: 'TrainerHub Session',
    description: `TrainerHub ${booking.session_type === 'virtual' ? 'virtual' : 'in-person'} training session. Manage details in TrainerHub.`,
    start: { dateTime: booking.starts_at },
    end: { dateTime: endTime(booking.starts_at, booking.duration_min) },
  };
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const url = externalEventId ? `${base}/${encodeURIComponent(externalEventId)}` : base;
  const response = await fetch(url, {
    method: externalEventId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  const data = await response.json();
  if (!response.ok || !data.id) throw new Error(data.error?.message || 'Google Calendar sync failed.');
  return { eventId: String(data.id), calendarId: 'primary' };
}

async function syncMicrosoft(accessToken: string, booking: any, externalEventId?: string | null) {
  const event = {
    subject: 'TrainerHub Session',
    body: { contentType: 'text', content: `TrainerHub ${booking.session_type === 'virtual' ? 'virtual' : 'in-person'} training session. Manage details in TrainerHub.` },
    start: { dateTime: booking.starts_at, timeZone: 'UTC' },
    end: { dateTime: endTime(booking.starts_at, booking.duration_min), timeZone: 'UTC' },
  };
  const base = 'https://graph.microsoft.com/v1.0/me/events';
  const url = externalEventId ? `${base}/${encodeURIComponent(externalEventId)}` : base;
  const response = await fetch(url, {
    method: externalEventId ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (externalEventId && response.status === 204) return { eventId: externalEventId, calendarId: 'default' };
  const data = await response.json();
  if (!response.ok || !data.id) throw new Error(data.error?.message || 'Microsoft Calendar sync failed.');
  return { eventId: String(data.id), calendarId: 'default' };
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
  const provider = String(body.provider ?? '');
  const scope = body.scope === 'enterprise' ? 'enterprise' : 'personal';
  const corporateAccountId = scope === 'enterprise' ? String(body.corporate_account_id ?? '') : '';
  if (!['google_calendar', 'microsoft_365'].includes(provider)) return json({ error: 'Unsupported provider' }, 400);

  if (scope === 'enterprise') {
    const { data: adminRole } = await admin.from('corporate_admins').select('id').eq('account_id', corporateAccountId).eq('user_id', user.id).maybeSingle();
    if (!adminRole) return json({ error: 'Enterprise admin access required' }, 403);
  }

  let connectionQuery = admin.from('integration_connections').select('*').eq('provider', provider).eq('status', 'connected');
  connectionQuery = scope === 'enterprise'
    ? connectionQuery.eq('corporate_account_id', corporateAccountId)
    : connectionQuery.eq('owner_user_id', user.id);
  const { data: connection, error: connectionError } = await connectionQuery.maybeSingle();
  if (connectionError || !connection) return json({ error: 'Connected calendar integration not found.' }, 404);

  try {
    const accessToken = await loadAccessToken(connection);
    const now = new Date();
    const horizon = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    let bookings: any[] = [];
    if (scope === 'personal') {
      const { data, error } = await admin
        .from('bookings')
        .select('id, trainer_id, client_id, starts_at, duration_min, session_type, status')
        .eq('status', 'confirmed')
        .gte('starts_at', now.toISOString())
        .lte('starts_at', horizon.toISOString())
        .or(`trainer_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('starts_at');
      if (error) throw new Error(error.message);
      bookings = data ?? [];
    } else {
      const { data: members, error: memberError } = await admin
        .from('corporate_members')
        .select('user_id')
        .eq('corporate_account_id', corporateAccountId)
        .eq('status', 'active');
      if (memberError) throw new Error(memberError.message);
      const memberIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
      if (memberIds.length) {
        const { data, error } = await admin
          .from('bookings')
          .select('id, trainer_id, client_id, starts_at, duration_min, session_type, status')
          .eq('status', 'confirmed')
          .gte('starts_at', now.toISOString())
          .lte('starts_at', horizon.toISOString())
          .in('client_id', memberIds)
          .order('starts_at');
        if (error) throw new Error(error.message);
        bookings = data ?? [];
      }
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const booking of bookings.slice(0, 100)) {
      try {
        const { data: existing } = await admin
          .from('integration_calendar_event_links')
          .select('id, external_event_id')
          .eq('integration_connection_id', connection.id)
          .eq('booking_id', booking.id)
          .maybeSingle();
        const result = provider === 'google_calendar'
          ? await syncGoogle(accessToken, booking, existing?.external_event_id)
          : await syncMicrosoft(accessToken, booking, existing?.external_event_id);
        const payload = {
          integration_connection_id: connection.id,
          booking_id: booking.id,
          external_calendar_id: result.calendarId,
          external_event_id: result.eventId,
          last_synced_at: new Date().toISOString(),
        };
        if (existing?.id) {
          await admin.from('integration_calendar_event_links').update(payload).eq('id', existing.id);
        } else {
          await admin.from('integration_calendar_event_links').insert(payload);
        }
        synced += 1;
      } catch (error) {
        failed += 1;
        if (errors.length < 5) errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      }
    }

    const syncStatus = failed ? (synced ? 'success' : 'failed') : 'success';
    const syncedAt = new Date().toISOString();
    await admin.from('integration_connections').update({ last_sync_at: syncedAt, updated_at: syncedAt }).eq('id', connection.id);
    await admin.from('integration_sync_events').insert({
      integration_connection_id: connection.id,
      event_type: 'calendar_sync',
      status: syncStatus,
      summary: `${synced} event${synced === 1 ? '' : 's'} synced${failed ? `, ${failed} failed` : ''}`,
      metadata: { synced, failed, errors, direction: 'trainerhub_to_provider' },
    });

    return json({ synced, failed, errors, last_sync_at: syncedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Calendar sync failed';
    await admin.from('integration_sync_events').insert({
      integration_connection_id: connection.id,
      event_type: 'calendar_sync',
      status: 'failed',
      summary: message.slice(0, 180),
    });
    return json({ error: message }, 500);
  }
});
