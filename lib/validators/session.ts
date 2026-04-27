import { z } from 'zod';

export const sessionStatusSchema = z.enum(['scheduled', 'completed', 'canceled']);

export const sessionCreateSchema = z.object({
  client_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  duration_min: z.number().int().min(5).max(480),
  notes: z.string().max(2000).optional(),
});

export const sessionUpdateSchema = sessionCreateSchema.partial().extend({
  status: sessionStatusSchema.optional(),
});

export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;
