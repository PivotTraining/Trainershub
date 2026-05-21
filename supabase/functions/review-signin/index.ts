// Edge function that can issue a real Supabase session for an App Review demo
// account without password/OTP. This is intentionally disabled unless
// REVIEW_SIGNIN_ENABLED is set to "true"; never call it from production client
// code with a bundled shared secret.
//
// Secrets required (set via Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL                  (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-provided)
//   REVIEW_SIGNIN_ENABLED         ("true" only while needed)
//   REVIEW_SIGNIN_SECRET          (you set this — any random string)
//   REVIEW_DEMO_EMAIL             (e.g. testing@trainershub.com)

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

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const length = Math.max(aBytes.length, bBytes.length);

  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (Deno.env.get('REVIEW_SIGNIN_ENABLED') !== 'true') {
      return json({ error: 'review sign-in disabled' }, 404);
    }

    const body = await req.json().catch(() => ({}));
    const provided = String(body.secret ?? '');
    const expected = Deno.env.get('REVIEW_SIGNIN_SECRET') ?? '';
    const demoEmail = Deno.env.get('REVIEW_DEMO_EMAIL') ?? 'testing@trainershub.com';

    if (!expected || !timingSafeEqual(provided, expected)) {
      return json({ error: 'forbidden' }, 403);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Generate a magiclink for the demo user and parse the embedded tokens.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: demoEmail,
    });
    if (error || !data?.properties?.action_link) {
      return json({ error: error?.message ?? 'no link' }, 500);
    }

    // Verify the OTP from the generated link to get a real session pair.
    const { data: verify, error: verifyErr } = await admin.auth.verifyOtp({
      type: 'magiclink',
      email: demoEmail,
      token: data.properties.email_otp,
    });
    if (verifyErr || !verify.session) {
      return json({ error: verifyErr?.message ?? 'no session' }, 500);
    }

    return json({
      access_token: verify.session.access_token,
      refresh_token: verify.session.refresh_token,
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
