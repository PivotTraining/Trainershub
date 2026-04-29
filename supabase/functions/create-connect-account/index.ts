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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  // Verify caller is authenticated
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

  try {
    // Fetch or create Stripe Connect account
    const { data: profile } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

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
      await supabase
        .from('trainer_profiles')
        .update({ stripe_account_id: accountId })
        .eq('user_id', user.id);
    }

    // Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_SCHEME}://stripe/refresh`,
      return_url: `${APP_SCHEME}://stripe/return`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, account_id: accountId }),
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
