import { z } from 'zod';

export const clientCreateSchema = z.object({
  email: z.string().email(),
  goals: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const clientUpdateSchema = z.object({
  goals: z.string().max(2000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
