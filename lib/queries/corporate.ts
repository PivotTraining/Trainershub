import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type {
  AcceptInvitePayload,
  BulkInvitePayload,
  CorporateAccount,
  CorporateInvite,
  CorporateMember,
  CorporateMemberWithProfile,
  CorporateSeatUsage,
  CreateCorporateAccountPayload,
  InviteMemberPayload,
} from '../types/corporate';

// ── Query keys ────────────────────────────────────────────────────────────────

export const corpKeys = {
  account:    (id: string)  => ['corporate', 'account', id] as const,
  myAccount:                  () => ['corporate', 'myAccount'] as const,
  members:    (acctId: string) => ['corporate', 'members', acctId] as const,
  invites:    (acctId: string) => ['corporate', 'invites', acctId] as const,
  seats:      (acctId: string) => ['corporate', 'seats', acctId] as const,
  adminRole:                  () => ['corporate', 'adminRole'] as const,
};

// ── Account ───────────────────────────────────────────────────────────────────

/** The corporate account the current user belongs to (as member or admin). */
export function useMyCorporateAccount() {
  return useQuery({
    queryKey: corpKeys.myAccount(),
    queryFn: async (): Promise<CorporateAccount | null> => {
      // Check membership first
      const { data: memberRow } = await supabase
        .from('corporate_members')
        .select('corporate_account_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .eq('status', 'active')
        .maybeSingle();

      const acctId = memberRow?.corporate_account_id;
      if (!acctId) {
        // Check admin role
        const { data: adminRow } = await supabase
          .from('corporate_admins')
          .select('corporate_account_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
          .maybeSingle();
        if (!adminRow) return null;
        const { data, error } = await supabase
          .from('corporate_accounts')
          .select('*')
          .eq('id', adminRow.corporate_account_id)
          .single();
        if (error) throw new Error(error.message);
        return data as CorporateAccount;
      }

      const { data, error } = await supabase
        .from('corporate_accounts')
        .select('*')
        .eq('id', acctId)
        .single();
      if (error) throw new Error(error.message);
      return data as CorporateAccount;
    },
  });
}

export function useCreateCorporateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCorporateAccountPayload): Promise<CorporateAccount> => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // 1. Create account
      const { data: acct, error: acctErr } = await supabase
        .from('corporate_accounts')
        .insert({
          name:          payload.name,
          domain:        payload.domain ?? null,
          billing_email: payload.billing_email ?? user.email ?? null,
          seat_count:    payload.seat_count ?? 10,
        })
        .select()
        .single();
      if (acctErr) throw new Error(acctErr.message);

      // 2. Make the creator an owner-admin
      const { error: adminErr } = await supabase
        .from('corporate_admins')
        .insert({ corporate_account_id: acct.id, user_id: user.id, role: 'owner' });
      if (adminErr) throw new Error(adminErr.message);

      return acct as CorporateAccount;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: corpKeys.myAccount() }),
  });
}

// ── Admin role check ──────────────────────────────────────────────────────────

export function useMyCorpAdminRole(acctId: string | undefined) {
  return useQuery({
    enabled: !!acctId,
    queryKey: [...corpKeys.adminRole(), acctId],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;
      const { data } = await supabase
        .from('corporate_admins')
        .select('role')
        .eq('corporate_account_id', acctId!)
        .eq('user_id', user.id)
        .maybeSingle();
      return data?.role ?? null;
    },
  });
}

// ── Members ───────────────────────────────────────────────────────────────────

export function useCorporateMembers(acctId: string | undefined) {
  return useQuery({
    enabled: !!acctId,
    queryKey: corpKeys.members(acctId!),
    queryFn: async (): Promise<CorporateMemberWithProfile[]> => {
      const { data, error } = await supabase
        .from('corporate_members')
        .select('*, profile:profiles!user_id(full_name, avatar_url, email)')
        .eq('corporate_account_id', acctId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CorporateMemberWithProfile[];
    },
  });
}

export function useSuspendMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, acctId }: { memberId: string; acctId: string }) => {
      const { error } = await supabase
        .from('corporate_members')
        .update({ status: 'suspended' })
        .eq('id', memberId)
        .eq('corporate_account_id', acctId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { acctId }) =>
      qc.invalidateQueries({ queryKey: corpKeys.members(acctId) }),
  });
}

export function useReactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, acctId }: { memberId: string; acctId: string }) => {
      const { error } = await supabase
        .from('corporate_members')
        .update({ status: 'active' })
        .eq('id', memberId)
        .eq('corporate_account_id', acctId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { acctId }) =>
      qc.invalidateQueries({ queryKey: corpKeys.members(acctId) }),
  });
}

// ── Seat usage ────────────────────────────────────────────────────────────────

export function useSeatUsage(acctId: string | undefined) {
  return useQuery({
    enabled: !!acctId,
    queryKey: corpKeys.seats(acctId!),
    queryFn: async (): Promise<CorporateSeatUsage | null> => {
      const { data, error } = await supabase
        .from('corporate_seat_usage')
        .select('*')
        .eq('corporate_account_id', acctId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as CorporateSeatUsage | null;
    },
  });
}

// ── Invites ───────────────────────────────────────────────────────────────────

export function usePendingInvites(acctId: string | undefined) {
  return useQuery({
    enabled: !!acctId,
    queryKey: corpKeys.invites(acctId!),
    queryFn: async (): Promise<CorporateInvite[]> => {
      const { data, error } = await supabase
        .from('corporate_invites')
        .select('*')
        .eq('corporate_account_id', acctId!)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CorporateInvite[];
    },
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InviteMemberPayload) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('corporate_invites').insert({
        corporate_account_id: payload.corporate_account_id,
        email:                payload.email.toLowerCase().trim(),
        invited_by:           user.id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, payload) =>
      qc.invalidateQueries({ queryKey: corpKeys.invites(payload.corporate_account_id) }),
  });
}

export function useBulkInviteMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BulkInvitePayload) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');
      const rows = payload.emails.map((e) => ({
        corporate_account_id: payload.corporate_account_id,
        email:                e.toLowerCase().trim(),
        invited_by:           user.id,
      }));
      // upsert to skip duplicates gracefully
      const { error } = await supabase
        .from('corporate_invites')
        .upsert(rows, { onConflict: 'corporate_account_id,email', ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, payload) =>
      qc.invalidateQueries({ queryKey: corpKeys.invites(payload.corporate_account_id) }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, acctId }: { inviteId: string; acctId: string }) => {
      const { error } = await supabase
        .from('corporate_invites')
        .delete()
        .eq('id', inviteId)
        .eq('corporate_account_id', acctId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, { acctId }) =>
      qc.invalidateQueries({ queryKey: corpKeys.invites(acctId) }),
  });
}

/**
 * Accept a corporate invite by token.
 * Called when the user taps the invite deep link after sign-in.
 */
export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AcceptInvitePayload) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      // Look up the invite
      const { data: invite, error: fetchErr } = await supabase
        .from('corporate_invites')
        .select('*')
        .eq('token', payload.token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!invite) throw new Error('Invite not found or has expired.');

      // Create the member row
      const { error: memberErr } = await supabase.from('corporate_members').insert({
        corporate_account_id: invite.corporate_account_id,
        user_id:              user.id,
        status:               'active',
        invited_by:           invite.invited_by,
      });
      if (memberErr && memberErr.code !== '23505') {
        // 23505 = unique violation — already a member, that's fine
        throw new Error(memberErr.message);
      }

      // Mark invite accepted
      await supabase
        .from('corporate_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: corpKeys.myAccount() }),
  });
}
