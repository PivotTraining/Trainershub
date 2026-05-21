// Edge function that issues a real Supabase session for the App Review demo
// trainer account WITHOUT requiring password or OTP. The app calls this with
// a shared secret in the request body; if the secret matches, the function
// uses the service role to mint a magiclink, parse out the access/refresh
// tokens, and return them. The app then calls supabase.auth.setSession() to
// establish the session locally.
//
// Secrets required (set via Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL                  (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY     (auto-provided)
//   REVIEW_SIGNIN_SECRET          (you set this — any random string)
//   REVIEW_DEMO_EMAIL             (e.g. testing@trainershub.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const provided = String(body.secret ?? '');
    const expected = Deno.env.get('REVIEW_SIGNIN_SECRET') ?? '';
    const demoEmail = Deno.env.get('REVIEW_DEMO_EMAIL') ?? 'testing@trainershub.com';

    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: error?.message ?? 'no link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the OTP from the generated link to get a real session pair.
    const { data: verify, error: verifyErr } = await admin.auth.verifyOtp({
      type: 'magiclink',
      email: demoEmail,
      token: data.properties.email_otp,
    });
    if (verifyErr || !verify.session) {
      return new Response(JSON.stringify({ error: verifyErr?.message ?? 'no session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        access_token: verify.session.access_token,
        refresh_token: verify.session.refresh_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
