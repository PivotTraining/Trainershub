/**
 * Returns whether the current user is an active corporate member.
 * Corporate members never see the payment screen — sessions are billed
 * to the company account instead.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './auth';

export function useCorporateMember() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    enabled: !!userId,
    queryKey: ['corporateMember', userId],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('corporate_members')
        .select('id')
        .eq('user_id', userId!)
        .eq('status', 'active')
        .maybeSingle();
      return data !== null;
    },
  });
}
