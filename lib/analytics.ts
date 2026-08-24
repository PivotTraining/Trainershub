import AsyncStorage from '@react-native-async-storage/async-storage';

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

type PendingEvent = {
  event_name: ProductEventName;
  properties: Record<string, unknown>;
  occurred_at: string;
};

const PENDING_KEY = 'trainerhub:analytics:pending:v1';
const MAX_PENDING_EVENTS = 50;

function platformLabel() {
  return typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
}

async function readPendingEvents(): Promise<PendingEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_PENDING_EVENTS) : [];
  } catch {
    return [];
  }
}

async function bufferPendingEvent(event: PendingEvent): Promise<void> {
  try {
    const pending = await readPendingEvents();
    pending.push(event);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending.slice(-MAX_PENDING_EVENTS)));
  } catch {
    // Analytics must never block the product experience.
  }
}

async function flushPendingEvents(userId: string): Promise<void> {
  const pending = await readPendingEvents();
  if (pending.length === 0) return;

  const { error } = await supabase.from('product_events').insert(
    pending.map((event) => ({
      user_id: userId,
      event_name: event.event_name,
      properties: {
        ...event.properties,
        occurred_at: event.occurred_at,
        platform: event.properties.platform ?? platformLabel(),
        buffered_before_auth: true,
      },
    })),
  );

  if (!error) await AsyncStorage.removeItem(PENDING_KEY);
  else console.warn('[analytics] buffered event flush failed:', error.message);
}

export async function trackEvent(
  eventName: ProductEventName,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const event: PendingEvent = {
    event_name: eventName,
    occurred_at: new Date().toISOString(),
    properties: {
      ...properties,
      platform: platformLabel(),
    },
  };

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;

    if (!userId) {
      await bufferPendingEvent(event);
      return;
    }

    await flushPendingEvents(userId);

    const { error } = await supabase.from('product_events').insert({
      user_id: userId,
      event_name: eventName,
      properties: {
        ...event.properties,
        occurred_at: event.occurred_at,
      },
    });

    if (error) console.warn('[analytics] event insert failed:', error.message);
  } catch (error) {
    console.warn('[analytics] event insert failed:', error);
  }
}
