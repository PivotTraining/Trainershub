import React, { createContext, useContext, useRef } from 'react';

type PaymentSheetError = {
  code?: string;
  message: string;
};

type PaymentResult = {
  error: PaymentSheetError | null;
};

type PaymentElementLike = {
  mount: (selector: string | HTMLElement) => void;
  destroy: () => void;
};

type StripeElementsLike = {
  create: (type: 'payment', options?: Record<string, unknown>) => PaymentElementLike;
};

type StripeLike = {
  elements: (options: Record<string, unknown>) => StripeElementsLike;
  confirmPayment: (options: {
    elements: StripeElementsLike;
    confirmParams: { return_url: string };
    redirect?: 'if_required' | 'always';
  }) => Promise<{
    error?: { code?: string; message?: string };
    paymentIntent?: { status?: string };
  }>;
};

type StripeFactory = (publishableKey: string) => StripeLike;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

interface StripeProviderProps {
  children: React.ReactNode;
  publishableKey?: string;
  urlScheme?: string;
}

interface CheckoutSession {
  stripe: StripeLike;
  elements: StripeElementsLike;
  paymentElement: PaymentElementLike;
  overlay: HTMLDivElement;
  payButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  errorText: HTMLDivElement;
}

const StripeWebContext = createContext({ publishableKey: '' });
const STRIPE_JS_URL = 'https://js.stripe.com/v3/';
let stripeScriptPromise: Promise<void> | null = null;

function loadStripeJs(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('Stripe checkout is only available in a browser.'));
  }

  if (window.Stripe) return Promise.resolve();
  if (stripeScriptPromise) return stripeScriptPromise;

  stripeScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${STRIPE_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Stripe.js failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Stripe.js failed to load.'));
    document.head.appendChild(script);
  });

  return stripeScriptPromise;
}

function applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  Object.assign(el.style, styles);
}

function buildCheckoutOverlay(): {
  overlay: HTMLDivElement;
  paymentMount: HTMLDivElement;
  payButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  errorText: HTMLDivElement;
} {
  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'TrainerHub secure checkout');
  applyStyles(overlay, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'rgba(0,0,0,0.52)',
    boxSizing: 'border-box',
  });

  const sheet = document.createElement('div');
  applyStyles(sheet, {
    width: 'min(520px, 100%)',
    maxHeight: 'calc(100dvh - 24px)',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: '22px',
    padding: '22px',
    paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
    boxShadow: '0 24px 80px rgba(0,0,0,0.28)',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  const header = document.createElement('div');
  applyStyles(header, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '18px',
  });

  const headingWrap = document.createElement('div');
  const title = document.createElement('div');
  title.textContent = 'Secure payment';
  applyStyles(title, { fontSize: '20px', fontWeight: '750', color: '#111111' });

  const subtitle = document.createElement('div');
  subtitle.textContent = 'Complete your TrainerHub booking with Stripe.';
  applyStyles(subtitle, { marginTop: '4px', fontSize: '13px', lineHeight: '18px', color: '#666666' });

  headingWrap.append(title, subtitle);

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Close';
  applyStyles(cancelButton, {
    border: '0',
    background: 'transparent',
    color: '#555555',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '650',
    padding: '8px',
  });

  header.append(headingWrap, cancelButton);

  const paymentMount = document.createElement('div');
  paymentMount.id = `trainerhub-payment-element-${Date.now()}`;
  applyStyles(paymentMount, { minHeight: '120px' });

  const errorText = document.createElement('div');
  errorText.setAttribute('role', 'alert');
  applyStyles(errorText, {
    minHeight: '20px',
    marginTop: '12px',
    color: '#b42318',
    fontSize: '13px',
    lineHeight: '18px',
  });

  const payButton = document.createElement('button');
  payButton.type = 'button';
  payButton.textContent = 'Pay securely';
  applyStyles(payButton, {
    width: '100%',
    marginTop: '12px',
    border: '0',
    borderRadius: '14px',
    background: '#111111',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '750',
    padding: '15px 18px',
  });

  const trust = document.createElement('div');
  trust.textContent = 'Payment details are encrypted and handled directly by Stripe.';
  applyStyles(trust, {
    marginTop: '12px',
    textAlign: 'center',
    color: '#777777',
    fontSize: '11px',
    lineHeight: '16px',
  });

  sheet.append(header, paymentMount, errorText, payButton, trust);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  return { overlay, paymentMount, payButton, cancelButton, errorText };
}

export function StripeProvider({ children, publishableKey = '' }: StripeProviderProps) {
  return (
    <StripeWebContext.Provider value={{ publishableKey }}>
      {children}
    </StripeWebContext.Provider>
  );
}

export function useStripe() {
  const { publishableKey } = useContext(StripeWebContext);
  const sessionRef = useRef<CheckoutSession | null>(null);

  const destroySession = () => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      session.paymentElement.destroy();
    } catch {
      // Element may already have been destroyed after a redirect.
    }
    session.overlay.remove();
    sessionRef.current = null;
  };

  const initPaymentSheet = async ({
    paymentIntentClientSecret,
  }: {
    paymentIntentClientSecret?: string;
    merchantDisplayName?: string;
    allowsDelayedPaymentMethods?: boolean;
  }): Promise<PaymentResult> => {
    destroySession();

    if (!publishableKey) {
      return { error: { message: 'Stripe is not configured for this web deployment.' } };
    }
    if (!paymentIntentClientSecret) {
      return { error: { message: 'Missing payment intent client secret.' } };
    }

    try {
      await loadStripeJs();
      if (!window.Stripe) throw new Error('Stripe.js did not initialize.');

      const stripe = window.Stripe(publishableKey);
      const elements = stripe.elements({
        clientSecret: paymentIntentClientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#111111',
            borderRadius: '12px',
          },
        },
      });

      const { overlay, paymentMount, payButton, cancelButton, errorText } = buildCheckoutOverlay();
      const paymentElement = elements.create('payment', { layout: 'tabs' });
      paymentElement.mount(paymentMount);

      sessionRef.current = {
        stripe,
        elements,
        paymentElement,
        overlay,
        payButton,
        cancelButton,
        errorText,
      };

      return { error: null };
    } catch (error: unknown) {
      destroySession();
      return {
        error: {
          message: error instanceof Error ? error.message : 'Unable to initialize secure checkout.',
        },
      };
    }
  };

  const presentPaymentSheet = async (): Promise<PaymentResult> => {
    const session = sessionRef.current;
    if (!session) {
      return { error: { message: 'Secure checkout is not initialized.' } };
    }

    session.overlay.style.display = 'flex';

    return new Promise((resolve) => {
      let finished = false;

      const finish = (result: PaymentResult) => {
        if (finished) return;
        finished = true;
        document.removeEventListener('keydown', onKeyDown);
        destroySession();
        resolve(result);
      };

      const cancel = () => finish({ error: { code: 'Canceled', message: 'Payment canceled.' } });

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') cancel();
      };

      document.addEventListener('keydown', onKeyDown);
      session.cancelButton.onclick = cancel;
      session.overlay.onclick = (event) => {
        if (event.target === session.overlay) cancel();
      };

      session.payButton.onclick = async () => {
        session.errorText.textContent = '';
        session.payButton.disabled = true;
        session.payButton.style.opacity = '0.65';
        session.payButton.style.cursor = 'wait';
        session.payButton.textContent = 'Processing…';

        try {
          const result = await session.stripe.confirmPayment({
            elements: session.elements,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
          });

          if (result.error) {
            session.errorText.textContent = result.error.message ?? 'Payment could not be completed.';
            session.payButton.disabled = false;
            session.payButton.style.opacity = '1';
            session.payButton.style.cursor = 'pointer';
            session.payButton.textContent = 'Pay securely';
            return;
          }

          finish({ error: null });
        } catch (error: unknown) {
          session.errorText.textContent =
            error instanceof Error ? error.message : 'Payment could not be completed.';
          session.payButton.disabled = false;
          session.payButton.style.opacity = '1';
          session.payButton.style.cursor = 'pointer';
          session.payButton.textContent = 'Pay securely';
        }
      };
    });
  };

  return {
    initPaymentSheet,
    presentPaymentSheet,
    confirmPayment: async (): Promise<{ error: PaymentSheetError | null; paymentIntent: null }> => ({
      error: { message: 'Use the TrainerHub web payment sheet to confirm this payment.' },
      paymentIntent: null,
    }),
  };
}
