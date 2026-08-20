import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedProviders = new Set(['google_calendar', 'microsoft_365', 'zoom']);
const allowedReturnPrefixes = ['https://trainershub.app/', 'https://www.trainershub.app/', 'trainerhub://'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeReturnUrl(value: unknown): string {
  const candidate = String(value ?? '').trim();
  if (allowedReturnPrefixes.some((prefix) => candidate.startsWith(prefix))) return candidate;
  return 'https://trainershub.app/integrations';
}

function providerLabel(provider: string) {
  if (provider === 'google_calendar') return 'Google Calendar';
  if (provider === 'microsoft_365') return 'Microsoft 365';
  return 'Zoom';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userResult, error: authError } = await admin.auth.getUser(token);
  const user = userResult.user;
  if (authError || !user || user.is_anonymous) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid request body' }, 400); }

  const provider = String(body.provider ?? '');
  const scope = body.scope === 'enterprise' ? 'enterprise' : 'personal';
  const corporateAccountId = scope === 'enterprise' ? String(body.corporate_account_id ?? '') : '';
  const returnUrl = safeReturnUrl(body.return_url);
  if (!allowedProviders.has(provider)) return json({ error: 'Unsupported provider' }, 400);

  if (scope === 'enterprise') {
    if (!corporateAccountId) return json({ error: 'corporate_account_id required' }, 400);
    const { data: adminRole, error: adminError } = await admin.from('corporate_admins').select('id').eq('account_id', corporateAccountId).eq('user_id', user.id).maybeSingle();
    if (adminError || !adminRole) return json({ error: 'Enterprise admin access required' }, 403);
  }

  const clientId = provider === 'google_calendar'
    ? Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')
    : provider === 'microsoft_365'
      ? Deno.env.get('MICROSOFT_CALENDAR_CLIENT_ID')
      : Deno.env.get('ZOOM_CLIENT_ID');

  if (!clientId) return json({ error: 'provider_not_configured', message: `${providerLabel(provider)} OAuth credentials have not been added to TrainerHub yet.` }, 503);

  const state = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const { error: stateError } = await admin.rpc('integration_oauth_state_create', {
    p_state: state, p_user_id: user.id, p_provider: provider, p_scope: scope,
    p_corporate_account_id: scope === 'enterprise' ? corporateAccountId : null, p_return_url: returnUrl,
  });
  if (stateError) return json({ error: stateError.message }, 500);

  const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/integration-oauth-callback`;
  let authorizationUrl: string;

  if (provider === 'google_calendar') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId); url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code'); url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent'); url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly');
    url.searchParams.set('state', state); authorizationUrl = url.toString();
  } else if (provider === 'microsoft_365') {
    const tenant = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
    const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
    url.searchParams.set('client_id', clientId); url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code'); url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', 'offline_access User.Read Calendars.ReadWrite'); url.searchParams.set('state', state);
    authorizationUrl = url.toString();
  } else {
    const url = new URL('https://zoom.us/oauth/authorize');
    url.searchParams.set('response_type', 'code'); url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl); url.searchParams.set('state', state);
    authorizationUrl = url.toString();
  }

  let lookup = admin.from('integration_connections').select('id').eq('provider', provider);
  lookup = scope === 'enterprise' ? lookup.eq('corporate_account_id', corporateAccountId) : lookup.eq('owner_user_id', user.id);
  const { data: existing } = await lookup.maybeSingle();

  const connectionPayload = {
    owner_user_id: scope === 'personal' ? user.id : null,
    corporate_account_id: scope === 'enterprise' ? corporateAccountId : null,
    provider, category: provider === 'zoom' ? 'Virtual sessions' : 'Calendar', scope, status: 'pending',
    display_name: providerLabel(provider), updated_at: new Date().toISOString(),
    config_public: { oauth_started_at: new Date().toISOString() },
  };
  if (existing?.id) await admin.from('integration_connections').update(connectionPayload).eq('id', existing.id);
  else await admin.from('integration_connections').insert(connectionPayload);

  return json({ authorization_url: authorizationUrl, provider, scope });
});
