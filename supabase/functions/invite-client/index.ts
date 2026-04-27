/**
 * invite-client — Supabase Edge Function
 *
 * Allows a trainer to invite a client by email. If the email is already
 * registered, the existing user is linked; otherwise Supabase Auth sends
 * an invite email and creates the user with role = 'client'.
 *
 * Request body (JSON):
 *   { email: string; goals?: string; notes?: string }
 *
 * Response body (JSON):
 *   { clientId: string }
 *
 * Auth: caller must be authenticated as a trainer (verified via JWT).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify caller is an authenticated trainer ──────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } },
    );

    const {
      data: { user: caller },
      error: authError,
    } = await callerClient.auth.getUser();

    if (authError || !caller) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'trainer') {
      return json({ error: 'Forbidden — only trainers can invite clients' }, 403);
    }

    // ── 2. Parse + validate body ──────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const email: string = (body.email ?? '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return json({ error: 'email is required and must be valid' }, 400);
    }

    const goals: string | null = body.goals?.trim() || null;
    const notes: string | null = body.notes?.trim() || null;

    // ── 3. Admin client (service role) ────────────────────────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── 4. Look up or invite the user ─────────────────────────────────────
    let clientUserId: string;

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      clientUserId = existingProfile.id;
    } else {
      // Invite via Supabase Auth — sends a magic-link email
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: { role: 'client' },
          redirectTo: `${Deno.env.get('APP_URL') ?? 'trainerhub://'}/`,
        },
      );
      if (inviteError || !invited.user) {
        throw new Error(inviteError?.message ?? 'Failed to invite user');
      }
      clientUserId = invited.user.id;
    }

    // ── 5. Upsert the client row (idempotent) ─────────────────────────────
    const { data: clientRow, error: clientError } = await adminClient
      .from('clients')
      .upsert(
        {
          user_id: clientUserId,
          trainer_id: caller.id,
          goals,
          notes,
        },
        { onConflict: 'user_id,trainer_id' },
      )
      .select('id')
      .single();

    if (clientError || !clientRow) {
      throw new Error(clientError?.message ?? 'Failed to create client record');
    }

    return json({ clientId: clientRow.id }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
