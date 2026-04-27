import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Program, ProgramAssignment } from '../types';
import type { ProgramAssignmentInput, ProgramCreateInput } from '../validators/program';

export function useTrainerPrograms(trainerId: string | undefined) {
  return useQuery({
    enabled: !!trainerId,
    queryKey: ['programs', trainerId],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Program[];
    },
  });
}

export function useCreateProgram(trainerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgramCreateInput): Promise<Program> => {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          trainer_id: trainerId,
          title: input.title,
          description: input.description ?? null,
        })
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Program;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programs', trainerId] });
    },
  });
}

export function useAssignProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgramAssignmentInput): Promise<ProgramAssignment> => {
      const { data, error } = await supabase
        .from('program_assignments')
        .insert(input)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as ProgramAssignment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['programs'] });
      qc.invalidateQueries({ queryKey: ['program_assignments', 'client', data.client_id] });
    },
  });
}

export function useClientAssignedPrograms(clientId: string | undefined) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ['program_assignments', 'client', clientId],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from('program_assignments')
        .select('program:programs(*)')
        .eq('client_id', clientId!);
      if (error) throw new Error(error.message);
      type Row = { program: Program | Program[] | null };
      return ((data ?? []) as unknown as Row[])
        .map((row) => (Array.isArray(row.program) ? row.program[0] : row.program))
        .filter((p): p is Program => !!p);
    },
  });
}

export function useClientPrograms(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['programs', 'client', userId],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from('programs')
        .select('*, program_assignments!inner(client_id, clients!inner(user_id))')
        .eq('program_assignments.clients.user_id', userId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as Program[];
    },
  });
}
