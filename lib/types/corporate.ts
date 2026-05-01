// ─────────────────────────────────────────────────────────────────────────────
// Corporate / B2B domain types
// ─────────────────────────────────────────────────────────────────────────────

export type CorporatePlan = 'starter' | 'growth' | 'enterprise';
export type CorporateAdminRole = 'owner' | 'admin';
export type CorporateMemberStatus = 'invited' | 'active' | 'suspended';

// ── Row shapes (match DB columns) ─────────────────────────────────────────────

export interface CorporateAccount {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  plan: CorporatePlan;
  seat_count: number;
  billing_email: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorporateAdmin {
  id: string;
  corporate_account_id: string;
  user_id: string;
  role: CorporateAdminRole;
  created_at: string;
}

export interface CorporateMember {
  id: string;
  corporate_account_id: string;
  user_id: string;
  status: CorporateMemberStatus;
  invited_by: string | null;
  seat_assigned_at: string;
  created_at: string;
}

export interface CorporateInvite {
  id: string;
  corporate_account_id: string;
  email: string;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// ── Extended / joined shapes ──────────────────────────────────────────────────

export interface CorporateMemberWithProfile extends CorporateMember {
  profile: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export interface CorporateSeatUsage {
  corporate_account_id: string;
  seat_count: number;
  seats_used: number;
}

// ── Mutation payloads ─────────────────────────────────────────────────────────

export interface CreateCorporateAccountPayload {
  name: string;
  domain?: string;
  billing_email?: string;
  seat_count?: number;
}

export interface InviteMemberPayload {
  corporate_account_id: string;
  email: string;
}

export interface BulkInvitePayload {
  corporate_account_id: string;
  emails: string[];
}

export interface AcceptInvitePayload {
  token: string;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export const PLAN_LABELS: Record<CorporatePlan, string> = {
  starter:    'Starter',
  growth:     'Growth',
  enterprise: 'Enterprise',
};

export const PLAN_SEAT_DEFAULTS: Record<CorporatePlan, number> = {
  starter:    10,
  growth:     50,
  enterprise: 250,
};
