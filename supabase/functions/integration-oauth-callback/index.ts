import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function redirect(base: string, params: Record<string, string>) {
  const fallback = 'https://trainershub.app/integrations';
  let url: URL;
  try {
    url = new URL(base || fallback);
  } catch {
    url = new URL(fallback);
  }
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return Response.redirect(url.toString(), 302);
}

async function exchangeGoogle(code: string, callbackUrl: string) {
  const clientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) throw new Error('Google Calendar OAuth is not configured.');
  const body = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUrl, grant_type: 'authorization_code' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || 'Google token exchange failed.');
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = profileResponse.ok ? await profileResponse.json() : {};
  return { tokens, label: String(profile.email || profile.name || 'Google Calendar') };
}

async function exchangeMicrosoft(code: string, callbackUrl: string) {
  const clientId = Deno.env.get('MICROSOFT_CALENDAR_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('MICROSOFT_CALENDAR_CLIENT_SECRET') ?? '';
  const tenant = Deno.env.get('MICROSOFT_TENANT_ID') || 'common';
  if (!clientId || !clientSecret) throw new Error('Microsoft 365 OAuth is not configured.');
  const body = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUrl, grant_type: 'authorization_code', scope: 'offline_access User.Read Calendars.ReadWrite' });
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || tokens.error || 'Microsoft token exchange failed.');
  const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = profileResponse.ok ? await profileResponse.json() : {};
  return { tokens, label: String(profile.mail || profile.userPrincipalName || profile.displayName || 'Microsoft 365') };
}

Deno.serve(async (req) => {
  const requestUrl = new URL(req.url);
  const state = requestUrl.searchParams.get('state') ?? '';
  const code = requestUrl.searchParams.get('code') ?? '';
  const providerError = requestUrl.searchParams.get('error') ?? '';

  if (!state) return redirect('https://trainershub.app/integrations', { oauth_error: 'missing_state' });

  const { data: stateRows, error: stateError } = await admin.rpc('integration_oauth_state_consume', { p_state: state });
  const stateRow = Array.isArray(stateRows) ? stateRows[0] : null;
  if (stateError || !stateRow) return redirect('https://trainershub.app/integrations', { oauth_error: 'invalid_or_expired_state' });

  const returnUrl = String(stateRow.return_url || 'https://trainershub.app/integrations');
  const provider = String(stateRow.provider);
  const scope = String(stateRow.scope);
  const userId = String(stateRow.user_id);
  const corporateAccountId = stateRow.corporate_account_id ? String(stateRow.corporate_account_id) : null;

  if (providerError) return redirect(returnUrl, { oauth_error: providerError, provider });
  if (!code) return redirect(returnUrl, { oauth_error: 'missing_code', provider });

  try {
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/integration-oauth-callback`;
    const exchanged = provider === 'google_calendar'
      ? await exchangeGoogle(code, callbackUrl)
      : await exchangeMicrosoft(code, callbackUrl);

    const ownerId = scope === 'enterprise' ? corporateAccountId : userId;
    if (!ownerId) throw new Error('OAuth owner missing.');
    const secretName = `trainerhub_oauth_${provider}_${scope}_${ownerId}`;

    const { data: priorSecret } = await admin.rpc('integration_secret_read', { p_name: secretName });
    let prior: Record<string, unknown> = {};
    if (priorSecret) {
      try { prior = JSON.parse(String(priorSecret)); } catch { prior = {}; }
    }

    const expiresIn = Number(exchanged.tokens.expires_in ?? 3600);
    const secureToken = {
      ...prior,
      provider,
      access_token: exchanged.tokens.access_token,
      refresh_token: exchanged.tokens.refresh_token || prior.refresh_token || null,
      token_type: exchanged.tokens.token_type || 'Bearer',
      scope: exchanged.tokens.scope || prior.scope || null,
      expires_at: new Date(Date.now() + Math.max(expiresIn - 60, 60) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: vaultError } = await admin.rpc('integration_secret_upsert', {
      p_name: secretName,
      p_secret: JSON.stringify(secureToken),
      p_description: `TrainerHub ${provider} OAuth token for ${scope} owner ${ownerId}`,
    });
    if (vaultError) throw new Error(vaultError.message);

    let lookup = admin.from('integration_connections').select('id, config_public').eq('provider', provider);
    lookup = scope === 'enterprise'
      ? lookup.eq('corporate_account_id', corporateAccountId)
      : lookup.eq('owner_user_id', userId);
    const { data: connection, error: lookupError } = await lookup.maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    const now = new Date().toISOString();
    const payload = {
      owner_user_id: scope === 'personal' ? userId : null,
      corporate_account_id: scope === 'enterprise' ? corporateAccountId : null,
      provider,
      category: 'Calendar',
      scope,
      status: 'connected',
      display_name: provider === 'google_calendar' ? 'Google Calendar' : 'Microsoft 365',
      external_account_label: exchanged.label,
      credentials_ref: secretName,
      connected_at: now,
      updated_at: now,
      config_public: { ...(connection?.config_public || {}), sync_direction: 'trainerhub_to_provider', oauth_completed_at: now },
    };

    let connectionId = connection?.id;
    if (connectionId) {
      const { error } = await admin.from('integration_connections').update(payload).eq('id', connectionId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await admin.from('integration_connections').insert(payload).select('id').single();
      if (error) throw new Error(error.message);
      connectionId = inserted.id;
    }

    await admin.from('integration_sync_events').insert({
      integration_connection_id: connectionId,
      event_type: 'oauth_connected',
      status: 'success',
      summary: `${payload.display_name} connected`,
      metadata: { external_account_label: exchanged.label },
    });

    return redirect(returnUrl, { connected: '1', provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OAuth callback failed';
    return redirect(returnUrl, { oauth_error: message.slice(0, 160), provider });
  }
});
