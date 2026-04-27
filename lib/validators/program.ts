import { z } from 'zod';

export const programCreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(4000).optional(),
});

export const programUpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(4000).nullable().optional(),
});

export const programAssignmentSchema = z.object({
  program_id: z.string().uuid(),
  client_id: z.string().uuid(),
});

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
export type ProgramAssignmentInput = z.infer<typeof programAssignmentSchema>;
