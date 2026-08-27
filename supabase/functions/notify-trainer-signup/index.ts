import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, role, location_city, phone, created_at, liability_accepted_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return json({ error: profileError.message }, 500);
  if (!profile) return json({ delivered: false, reason: 'profile_missing' }, 404);
  if (profile.role !== 'trainer') return json({ delivered: false, reason: 'not_trainer' });
  if (!profile.liability_accepted_at || !profile.full_name || !profile.location_city) {
    return json({ delivered: false, reason: 'onboarding_incomplete' }, 409);
  }

  const { data: claimed, error: claimError } = await admin
    .schema('private')
    .from('trainer_signup_admin_notifications')
    .insert({ user_id: user.id })
    .select('user_id')
    .maybeSingle();

  if (claimError?.code === '23505') return json({ delivered: false, reason: 'already_notified' });
  if (claimError) return json({ error: claimError.message }, 500);
  if (!claimed) return json({ delivered: false, reason: 'already_notified' });

  try {
    const [apiKeyResult, recipientResult, fromResult] = await Promise.all([
      admin.rpc('integration_secret_read', { p_name: 'trainerhub_resend_signup_api_key' }),
      admin.rpc('integration_secret_read', { p_name: 'trainerhub_signup_admin_email' }),
      admin.rpc('integration_secret_read', { p_name: 'trainerhub_signup_from_email' }),
    ]);

    const apiKey = String(apiKeyResult.data ?? '').trim();
    const recipient = String(recipientResult.data ?? '').trim();
    const from = String(fromResult.data ?? '').trim();
    if (!apiKey || !recipient || !from) throw new Error('TrainerHub signup mail configuration is incomplete.');

    const created = new Date(profile.created_at).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York',
    });

    const onboardingStatus = 'Completed basic onboarding';
    const subject = `New Trainer Signup — ${profile.full_name}`;
    const text = [
      'New Trainer Signup — TrainerHub',
      '',
      `Name: ${profile.full_name}`,
      `Email: ${profile.email}`,
      `Location: ${profile.location_city}`,
      `Phone: ${profile.phone || 'Not provided'}`,
      `Signup date: ${created} ET`,
      `Onboarding status: ${onboardingStatus}`,
      '',
      'Open TrainerHub to review the trainer account and profile progress.',
    ].join('\n');

    const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#13263a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:28px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;"><tr><td style="background:#10283f;padding:24px 28px;"><p style="margin:0;color:#7ed3ff;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;">TRAINERHUB ADMIN</p><h1 style="margin:7px 0 0;color:#ffffff;font-size:26px;line-height:32px;">New trainer signup</h1></td></tr><tr><td style="padding:26px 28px;"><p style="margin:0 0 18px;color:#4f6070;font-size:14px;line-height:21px;">A trainer just completed basic onboarding.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#6d7883;font-size:12px;line-height:18px;width:145px;">Name</td><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#13263a;font-size:14px;line-height:20px;font-weight:700;">${escapeHtml(profile.full_name)}</td></tr><tr><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#6d7883;font-size:12px;line-height:18px;">Email</td><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#13263a;font-size:14px;line-height:20px;">${escapeHtml(profile.email)}</td></tr><tr><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#6d7883;font-size:12px;line-height:18px;">Location</td><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#13263a;font-size:14px;line-height:20px;">${escapeHtml(profile.location_city)}</td></tr><tr><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#6d7883;font-size:12px;line-height:18px;">Phone</td><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#13263a;font-size:14px;line-height:20px;">${escapeHtml(profile.phone || 'Not provided')}</td></tr><tr><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#6d7883;font-size:12px;line-height:18px;">Signup date</td><td style="padding:9px 0;border-bottom:1px solid #edf0f3;color:#13263a;font-size:14px;line-height:20px;">${escapeHtml(created)} ET</td></tr><tr><td style="padding:9px 0;color:#6d7883;font-size:12px;line-height:18px;">Onboarding</td><td style="padding:9px 0;color:#188254;font-size:14px;line-height:20px;font-weight:700;">${onboardingStatus}</td></tr></table><p style="margin:22px 0 0;color:#7a8793;font-size:12px;line-height:18px;">This is an internal TrainerHub operational notification.</p></td></tr></table></td></tr></table></body></html>`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject,
        text,
        html,
        reply_to: profile.email ? [profile.email] : undefined,
        tags: [
          { name: 'type', value: 'trainer_signup' },
          { name: 'environment', value: 'production' },
        ],
      }),
    });

    const resendBody = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok || !resendBody?.id) {
      throw new Error(resendBody?.message || `Resend request failed (${resendResponse.status})`);
    }

    await admin
      .schema('private')
      .from('trainer_signup_admin_notifications')
      .update({
        sent_at: new Date().toISOString(),
        resend_email_id: String(resendBody.id),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return json({ delivered: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup notification failed';
    await admin
      .schema('private')
      .from('trainer_signup_admin_notifications')
      .delete()
      .eq('user_id', user.id);
    return json({ error: message }, 500);
  }
});
