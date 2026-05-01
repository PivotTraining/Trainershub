/**
 * corporate-invite — Supabase Edge Function
 *
 * Sends a corporate invite email to one or more employees.
 * Called by the HR admin screen after inserting rows into corporate_invites.
 *
 * Request body (JSON):
 *   { inviteIds: string[] }   — IDs from the corporate_invites table
 *
 * The function fetches each invite (with account name) via the service role,
 * generates the deep-link URL, and sends the email via Resend.
 *
 * Auth: caller must be a corporate admin for the account (verified via JWT).
 *
 * Response: { sent: number; errors: string[] }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_SCHEME = 'trainerhub';

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') ?? 'TrainerHub <invites@trainerhub.app>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Resend error ${res.status}: ${detail}`);
  }
}

function buildInviteEmail(opts: {
  recipientEmail: string;
  companyName: string;
  token: string;
  expiresAt: string;
}): string {
  const deepLink = `${APP_SCHEME}://invite?token=${opts.token}`;
  const expiryDate = new Date(opts.expiresAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>You're invited to TrainerHub</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header band -->
          <tr>
            <td style="background:#D97706;padding:36px 40px 32px;">
              <p style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">TrainerHub</p>
              <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.85);font-weight:500;">
                Your company's coaching platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1A1512;">
                You've been invited to TrainerHub
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#8B7D73;line-height:1.6;">
                <strong style="color:#1A1512;">${opts.companyName}</strong> has set up a corporate
                TrainerHub account for your team. You now have access to coaches across fitness,
                performance, nutrition, and more — with sessions covered by your company.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#D97706;border-radius:12px;">
                    <a href="${deepLink}"
                       style="display:block;padding:14px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;white-space:nowrap;">
                      Accept your invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#8B7D73;">
                If the button doesn't work, open the TrainerHub app and tap:<br/>
                <span style="font-family:monospace;font-size:12px;color:#3D342C;background:#F7F5F2;padding:4px 8px;border-radius:6px;display:inline-block;margin-top:4px;">
                  ${deepLink}
                </span>
              </p>

              <hr style="border:none;border-top:1px solid #E5DDD6;margin:28px 0;"/>

              <p style="margin:0;font-size:12px;color:#B5A89F;line-height:1.5;">
                This invite expires on <strong>${expiryDate}</strong>.
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F7F5F2;padding:20px 40px;border-top:1px solid #E5DDD6;">
              <p style="margin:0;font-size:11px;color:#B5A89F;text-align:center;">
                TrainerHub · Corporate team benefits
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── 1. Verify caller is an authenticated corporate admin ──────────────
    const authHeader = req.headers.get('authorization') ?? '';
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } },
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // ── 2. Parse body ─────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const inviteIds: string[] = Array.isArray(body.inviteIds) ? body.inviteIds : [];
    if (inviteIds.length === 0) return json({ error: 'inviteIds is required' }, 400);
    if (inviteIds.length > 100) return json({ error: 'Maximum 100 invites per request' }, 400);

    // ── 3. Fetch invites with account name (service role) ─────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: invites, error: fetchErr } = await adminClient
      .from('corporate_invites')
      .select('id, email, token, expires_at, accepted_at, corporate_account_id, corporate_accounts(name)')
      .in('id', inviteIds)
      .is('accepted_at', null);

    if (fetchErr) throw new Error(fetchErr.message);
    if (!invites || invites.length === 0) return json({ sent: 0, errors: [] });

    // ── 4. Verify caller is an admin for ALL referenced accounts ──────────
    const acctIds = [...new Set(invites.map((i) => i.corporate_account_id))];
    const { data: adminRows, error: adminErr } = await adminClient
      .from('corporate_admins')
      .select('corporate_account_id')
      .in('corporate_account_id', acctIds)
      .eq('user_id', caller.id);

    if (adminErr) throw new Error(adminErr.message);
    const authorizedAccts = new Set((adminRows ?? []).map((r) => r.corporate_account_id));
    const unauthorized = acctIds.filter((id) => !authorizedAccts.has(id));
    if (unauthorized.length > 0) return json({ error: 'Forbidden' }, 403);

    // ── 5. Send emails ────────────────────────────────────────────────────
    const errors: string[] = [];
    let sent = 0;

    await Promise.allSettled(
      invites.map(async (invite) => {
        const account = invite.corporate_accounts as { name: string } | null;
        const companyName = account?.name ?? 'Your company';
        try {
          await sendEmail(
            invite.email,
            `You're invited to TrainerHub by ${companyName}`,
            buildInviteEmail({
              recipientEmail: invite.email,
              companyName,
              token: invite.token,
              expiresAt: invite.expires_at,
            }),
          );
          sent++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${invite.email}: ${msg}`);
        }
      }),
    );

    return json({ sent, errors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
