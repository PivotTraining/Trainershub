export type UserRole = 'trainer' | 'client';
export type SessionStatus = 'scheduled' | 'completed' | 'canceled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  trainer_id: string;
  goals: string | null;
  notes: string | null;
  created_at: string;
}

/** Client row with the joined profile fields */
export interface ClientWithProfile extends Client {
  profile: Pick<Profile, 'full_name' | 'email'> | null;
}

export interface Session {
  id: string;
  trainer_id: string;
  client_id: string;
  starts_at: string;
  duration_min: number;
  status: SessionStatus;
  notes: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

/** Session row with the joined client + profile name */
export interface SessionWithClient extends Session {
  clientName: string | null;
  clientEmail: string | null;
}

export interface ProgramAssignment {
  id: string;
  program_id: string;
  client_id: string;
  started_at: string;
}

// ── Marketplace types ──────────────────────────────────────────────────────────

export type SessionType = 'in-person' | 'virtual';
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'canceled';
export type VibeTag = 'motivator' | 'disciplinarian' | 'gentle' | 'high-energy' | 'spiritual' | 'data-driven';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TrainerProfileFull {
  user_id: string;
  bio: string | null;
  specialties: string[];
  hourly_rate_cents: number | null;
  location: string | null;
  session_types: SessionType[];
  languages: string[];
  vibe_tags: VibeTag[];
  instant_book: boolean;
  cancellation_hours: number;
  video_intro_url: string | null;
  avg_rating: number;
  review_count: number;
  is_verified: boolean;
  stripe_account_id: string | null;
  stripe_onboarded: boolean;
}

export interface TrainerListing extends TrainerProfileFull {
  full_name: string | null;
  email: string;
}

export interface AvailabilitySlot {
  id: string;
  trainer_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Review {
  id: string;
  trainer_id: string;
  client_id: string | null;
  session_id: string | null;
  rating: number;
  body: string | null;
  created_at: string;
  clientName?: string | null;
}

export interface Package {
  id: string;
  trainer_id: string;
  title: string;
  session_count: number;
  price_cents: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PackagePurchase {
  id: string;
  package_id: string | null;
  client_id: string;
  trainer_id: string;
  sessions_remaining: number;
  purchased_at: string;
  package?: Package | null;
}

export type BookingWithNames = Booking & { trainerName: string | null; clientName: string | null };

export interface Booking {
  id: string;
  trainer_id: string;
  client_id: string;
  starts_at: string;
  duration_min: number;
  session_type: SessionType;
  status: BookingStatus;
  package_purchase_id: string | null;
  notes: string | null;
  created_at: string;
  payment_intent_id: string | null;
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded';
}

export interface Favorite {
  id: string;
  client_id: string;
  trainer_id: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  client_id: string;
  session_id: string | null;
  mood: number | null;
  body: string | null;
  created_at: string;
}
