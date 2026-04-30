import React from 'react';

// Stripe React Native is not supported on web.
// This shim keeps the web preview working without native modules.
export function StripeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useStripe() {
  return {
    initPaymentSheet: async () => ({ error: null }),
    presentPaymentSheet: async () => ({ error: null }),
    confirmPayment: async () => ({ error: null, paymentIntent: null }),
  };
}
