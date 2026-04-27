import { clientCreateSchema, clientUpdateSchema } from '@/lib/validators/client';
import { programCreateSchema, programUpdateSchema } from '@/lib/validators/program';
import { sessionCreateSchema, sessionUpdateSchema } from '@/lib/validators/session';

// ── clientCreateSchema ────────────────────────────────────────────────────────

describe('clientCreateSchema', () => {
  it('accepts a valid client with email and goals', () => {
    expect(
      clientCreateSchema.safeParse({ email: 'jane@example.com', goals: 'Run a 5k' }).success,
    ).toBe(true);
  });

  it('accepts a client with email only', () => {
    expect(clientCreateSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(clientCreateSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects missing email', () => {
    expect(clientCreateSchema.safeParse({ goals: 'Be fit' }).success).toBe(false);
  });

  it('rejects goals exceeding 2000 chars', () => {
    expect(
      clientCreateSchema.safeParse({ email: 'a@b.com', goals: 'x'.repeat(2001) }).success,
    ).toBe(false);
  });
});

// ── clientUpdateSchema ────────────────────────────────────────────────────────

describe('clientUpdateSchema', () => {
  it('accepts partial update with just goals', () => {
    expect(clientUpdateSchema.safeParse({ goals: 'Lose 10 lbs' }).success).toBe(true);
  });

  it('accepts null to clear a field', () => {
    expect(clientUpdateSchema.safeParse({ goals: null, notes: null }).success).toBe(true);
  });

  it('accepts empty object', () => {
    expect(clientUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('rejects notes exceeding 2000 chars', () => {
    expect(clientUpdateSchema.safeParse({ notes: 'y'.repeat(2001) }).success).toBe(false);
  });
});

// ── sessionCreateSchema ───────────────────────────────────────────────────────

describe('sessionCreateSchema', () => {
  const validId = '00000000-0000-0000-0000-000000000001';

  it('accepts a valid session', () => {
    expect(
      sessionCreateSchema.safeParse({ client_id: validId, starts_at: new Date().toISOString(), duration_min: 60 }).success,
    ).toBe(true);
  });

  it('accepts a session with notes', () => {
    expect(
      sessionCreateSchema.safeParse({ client_id: validId, starts_at: new Date().toISOString(), duration_min: 45, notes: 'Focus on form' }).success,
    ).toBe(true);
  });

  it('rejects non-uuid client_id', () => {
    expect(
      sessionCreateSchema.safeParse({ client_id: 'abc', starts_at: new Date().toISOString(), duration_min: 60 }).success,
    ).toBe(false);
  });

  it('rejects too-short duration', () => {
    expect(
      sessionCreateSchema.safeParse({ client_id: validId, starts_at: new Date().toISOString(), duration_min: 1 }).success,
    ).toBe(false);
  });

  it('rejects too-long duration', () => {
    expect(
      sessionCreateSchema.safeParse({ client_id: validId, starts_at: new Date().toISOString(), duration_min: 999 }).success,
    ).toBe(false);
  });
});

// ── sessionUpdateSchema ───────────────────────────────────────────────────────

describe('sessionUpdateSchema', () => {
  it('accepts a partial update with just status', () => {
    expect(sessionUpdateSchema.safeParse({ status: 'completed' }).success).toBe(true);
  });

  it('accepts a partial update with just notes', () => {
    expect(sessionUpdateSchema.safeParse({ notes: 'Good session' }).success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    expect(sessionUpdateSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
});

// ── programCreateSchema ───────────────────────────────────────────────────────

describe('programCreateSchema', () => {
  it('accepts a valid program with title only', () => {
    expect(programCreateSchema.safeParse({ title: '12-week strength' }).success).toBe(true);
  });

  it('accepts a program with description', () => {
    expect(programCreateSchema.safeParse({ title: 'Mobility', description: 'Daily stretching' }).success).toBe(true);
  });

  it('rejects empty title', () => {
    expect(programCreateSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects title over 120 chars', () => {
    expect(programCreateSchema.safeParse({ title: 'a'.repeat(121) }).success).toBe(false);
  });

  it('rejects description over 4000 chars', () => {
    expect(programCreateSchema.safeParse({ title: 'Valid', description: 'x'.repeat(4001) }).success).toBe(false);
  });
});

// ── programUpdateSchema ───────────────────────────────────────────────────────

describe('programUpdateSchema', () => {
  it('accepts a partial title-only update', () => {
    expect(programUpdateSchema.safeParse({ title: 'New name' }).success).toBe(true);
  });

  it('accepts null description to clear it', () => {
    expect(programUpdateSchema.safeParse({ description: null }).success).toBe(true);
  });

  it('accepts an empty object', () => {
    expect(programUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('rejects empty string title', () => {
    expect(programUpdateSchema.safeParse({ title: '' }).success).toBe(false);
  });

  it('rejects description over 4000 chars', () => {
    expect(programUpdateSchema.safeParse({ description: 'x'.repeat(4001) }).success).toBe(false);
  });
});
