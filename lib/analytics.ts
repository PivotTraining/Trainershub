import { supabase } from './supabase';

export type ProductEventName =
  | 'screen_view'
  | 'sign_in_completed'
  | 'account_verified'
  | 'password_reset_requested';

export async function trackEvent(
  eventName: ProductEventName,
  properties: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabase.from('product_events').insert({
      event_name: eventName,
      properties,
    });
    if (error) console.warn('[analytics] event insert failed:', error.message);
  } catch (error) {
    console.warn('[analytics] event insert failed:', error);
  }
}
