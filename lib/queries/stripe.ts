import { useMutation } from '@tanstack/react-query';
import { supabase } from '../supabase';

/**
 * Calls the create-connect-account edge function and returns the Stripe
 * hosted onboarding URL. The trainer opens this in a WebBrowser.
 */
export function useStartStripeOnboarding() {
  return useMutation({
    mutationFn: async (): Promise<{ url: string; account_id: string }> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const json = await res.json() as { url?: string; account_id?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? 'Failed to start Stripe onboarding');
      return { url: json.url, account_id: json.account_id ?? '' };
    },
  });
}

/**
 * Calls the create-payment-intent edge function and returns the PaymentSheet
 * client secret.
 */
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: async (bookingId: string): Promise<string> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ booking_id: bookingId }),
        },
      );
      const json = await res.json() as { client_secret?: string; error?: string };
      if (!res.ok || !json.client_secret) {
        throw new Error(json.error ?? 'Failed to create payment intent');
      }
      return json.client_secret;
    },
  });
}
