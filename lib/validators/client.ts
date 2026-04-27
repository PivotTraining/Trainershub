import { z } from 'zod';

export const clientCreateSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(120),
  goals: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
