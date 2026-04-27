import { clientCreateSchema } from '@/lib/validators/client';
import { programCreateSchema } from '@/lib/validators/program';
import { sessionCreateSchema } from '@/lib/validators/session';

describe('clientCreateSchema', () => {
  it('accepts a valid client', () => {
    const result = clientCreateSchema.safeParse({
      email: 'jane@example.com',
      full_name: 'Jane Doe',
      goals: 'Run a 5k',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = clientCreateSchema.safeParse({
      email: 'not-an-email',
      full_name: 'Jane',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = clientCreateSchema.safeParse({
      email: 'jane@example.com',
      full_name: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('sessionCreateSchema', () => {
  it('accepts a valid session', () => {
    const result = sessionCreateSchema.safeParse({
      client_id: '00000000-0000-0000-0000-000000000001',
      starts_at: new Date().toISOString(),
      duration_min: 60,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid client_id', () => {
    const result = sessionCreateSchema.safeParse({
      client_id: 'abc',
      starts_at: new Date().toISOString(),
      duration_min: 60,
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-short duration', () => {
    const result = sessionCreateSchema.safeParse({
      client_id: '00000000-0000-0000-0000-000000000001',
      starts_at: new Date().toISOString(),
      duration_min: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('programCreateSchema', () => {
  it('accepts a valid program', () => {
    const result = programCreateSchema.safeParse({ title: '12-week strength' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = programCreateSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });
});
