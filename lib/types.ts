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

export interface ProgramAssignment {
  id: string;
  program_id: string;
  client_id: string;
  started_at: string;
}
