import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export type IntegrationScope = 'personal' | 'enterprise';
export type IntegrationStatus = 'available' | 'pending' | 'connected' | 'needs_setup' | 'disabled' | 'error';

export interface IntegrationConnection {
  id: string;
  owner_user_id: string | null;
  corporate_account_id: string | null;
  provider: string;
  category: string;
  status: IntegrationStatus;
  scope: IntegrationScope;
  display_name: string | null;
  external_account_label: string | null;
  config_public: Record<string, unknown>;
  last_sync_at: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useIntegrationConnections(ownerUserId?: string, corporateAccountId?: string) {
  return useQuery({
    enabled: !!ownerUserId || !!corporateAccountId,
    queryKey: ['integration_connections', ownerUserId ?? null, corporateAccountId ?? null],
    queryFn: async (): Promise<IntegrationConnection[]> => {
      let query = supabase.from('integration_connections').select('*').order('provider');
      query = corporateAccountId
        ? query.eq('corporate_account_id', corporateAccountId)
        : query.eq('owner_user_id', ownerUserId!);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as IntegrationConnection[];
    },
  });
}

export function useStartCalendarOAuth() {
  return useMutation({
    mutationFn: async (input: {
      provider: 'google_calendar' | 'microsoft_365';
      scope: IntegrationScope;
      corporateAccountId?: string;
      returnUrl: string;
    }): Promise<{ authorization_url: string }> => {
      const { data, error } = await supabase.functions.invoke('integration-oauth-start', {
        body: {
          provider: input.provider,
          scope: input.scope,
          corporate_account_id: input.corporateAccountId,
          return_url: input.returnUrl,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message || data.error);
      if (!data?.authorization_url) throw new Error('Authorization URL was not returned.');
      return data as { authorization_url: string };
    },
  });
}

export function useCalendarSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider: 'google_calendar' | 'microsoft_365';
      scope: IntegrationScope;
      corporateAccountId?: string;
    }): Promise<{ synced: number; failed: number; last_sync_at: string }> => {
      const { data, error } = await supabase.functions.invoke('integration-calendar-sync', {
        body: {
          provider: input.provider,
          scope: input.scope,
          corporate_account_id: input.corporateAccountId,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { synced: number; failed: number; last_sync_at: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration_connections'] }),
  });
}

export function useSaveIntegrationConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ownerUserId?: string;
      corporateAccountId?: string;
      provider: string;
      category: string;
      scope: IntegrationScope;
      status: IntegrationStatus;
      displayName: string;
      configPublic?: Record<string, unknown>;
    }) => {
      const scopeColumn = input.corporateAccountId ? 'corporate_account_id' : 'owner_user_id';
      const scopeValue = input.corporateAccountId ?? input.ownerUserId;
      if (!scopeValue) throw new Error('Missing integration owner.');

      const { data: existing, error: findError } = await supabase
        .from('integration_connections')
        .select('id')
        .eq(scopeColumn, scopeValue)
        .eq('provider', input.provider)
        .maybeSingle();
      if (findError) throw new Error(findError.message);

      const payload = {
        owner_user_id: input.corporateAccountId ? null : input.ownerUserId!,
        corporate_account_id: input.corporateAccountId ?? null,
        provider: input.provider,
        category: input.category,
        status: input.status,
        scope: input.scope,
        display_name: input.displayName,
        config_public: input.configPublic ?? {},
        connected_at: input.status === 'connected' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const result = existing?.id
        ? await supabase.from('integration_connections').update(payload).eq('id', existing.id).select('*').single()
        : await supabase.from('integration_connections').insert(payload).select('*').single();
      if (result.error) throw new Error(result.error.message);
      return result.data as IntegrationConnection;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration_connections'] }),
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('integration_connections').update({ status: 'disabled', connected_at: null, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integration_connections'] }),
  });
}
