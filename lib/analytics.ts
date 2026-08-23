import { supabase } from './supabase';

export type ProductEventName =
  | 'screen_view'
  | 'welcome_viewed'
  | 'signup_started'
  | 'otp_sent'
  | 'sign_in_completed'
  | 'account_verified'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'discover_searched'
  | 'trainer_profile_viewed'
  | 'trainer_favorited'
  | 'booking_started'
  | 'booking_requested'
  | 'booking_confirmed'
  | 'payment_started'
  | 'payment_completed'
  | 'session_completed'
  | 'review_submitted'
  | 'second_booking'
  | 'trainer_signup'
  | 'trainer_profile_started'
  | 'trainer_profile_completed'
  | 'availability_added'
  | 'stripe_connected'
  | 'first_request_received'
  | 'first_booking_confirmed'
  | 'first_payment'
  | 'first_repeat_client'
  | 'password_reset_requested';

export async function trackEvent(
  eventName: ProductEventName,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.from('product_events').insert({
      event_name: eventName,
      properties: {
        ...properties,
        platform: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    });
    if (error) console.warn('[analytics] event insert failed:', error.message);
  } catch (error) {
    console.warn('[analytics] event insert failed:', error);
  }
}
