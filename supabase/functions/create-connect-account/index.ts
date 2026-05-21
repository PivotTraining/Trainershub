/**
 * create-connect-account
 *
 * Creates (or retrieves) a Stripe Connect Express account for the calling trainer,
 * stores the account ID in trainer_profiles, and returns an Account Link URL
 * so the trainer can complete onboarding in a browser.
 *
 * Required env vars (set in Supabase dashboard → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   APP_SCHEME   (e.g. "trainerhub")
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

const APP_SCHEME = Deno.env.get('APP_SCHEME') ?? 'trainerhub';
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify caller is authenticated
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const { data: appProfile, error: appProfileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (appProfileError || appProfile?.role !== 'trainer') {
      return json({ error: 'Only trainer accounts can connect payouts' }, 403);
    }

    // Fetch or create Stripe Connect account
    const { data: profile, error: profileError } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      return json({ error: profileError.message }, 500);
    }

    let accountId: string = profile?.stripe_account_id ?? '';

    if (!accountId) {
      // Get trainer email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      const email = authUser?.user?.email ?? user.email ?? '';

      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        settings: {
          payouts: { schedule: { interval: 'weekly', weekly_anchor: 'monday' } },
        },
      });
      accountId = account.id;

      // Store in trainer_profiles
      const { error: upsertError } = await supabase
        .from('trainer_profiles')
        .upsert({ user_id: user.id, stripe_account_id: accountId }, { onConflict: 'user_id' });
      if (upsertError) throw new Error(upsertError.message);
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_SCHEME}://stripe/refresh`,
      return_url: `${APP_SCHEME}://stripe/return`,
      type: 'account_onboarding',
    });

    return json({ url: accountLink.url, account_id: accountId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
