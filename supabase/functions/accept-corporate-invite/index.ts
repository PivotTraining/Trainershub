/**
 * accept-corporate-invite
 *
 * Redeems a corporate invite token for the authenticated user. Invite lookup
 * uses the service role because corporate_invites is intentionally not readable
 * by arbitrary clients; redemption is still bound to the invited email address.
 *
 * Body: { token: string }
 */

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user?.email) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const token = String(body.token ?? '').trim();
    if (!token) return json({ error: 'token is required' }, 400);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: invite, error: inviteError } = await adminClient
      .from('corporate_invites')
      .select('id, corporate_account_id, email, invited_by, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (inviteError) throw new Error(inviteError.message);
    if (!invite) return json({ error: 'Invite not found or has expired.' }, 404);
    if (invite.accepted_at) return json({ error: 'Invite has already been accepted.' }, 409);
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return json({ error: 'Invite not found or has expired.' }, 410);
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return json({ error: 'Sign in with the email address this invite was sent to.' }, 403);
    }

    const { error: memberError } = await adminClient
      .from('corporate_members')
      .upsert(
        {
          corporate_account_id: invite.corporate_account_id,
          user_id: user.id,
          status: 'active',
          invited_by: invite.invited_by,
        },
        { onConflict: 'corporate_account_id,user_id' },
      );

    if (memberError) throw new Error(memberError.message);

    const { error: acceptError } = await adminClient
      .from('corporate_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)
      .is('accepted_at', null);

    if (acceptError) throw new Error(acceptError.message);

    return json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
