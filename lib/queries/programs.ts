import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Program, ProgramAssignment } from '../types';
import type {
  ProgramAssignmentInput,
  ProgramCreateInput,
  ProgramUpdateInput,
} from '../validators/program';

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

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // program_assignments are cascade-deleted via FK on delete cascade in schema
      const { error } = await supabase.from('programs').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: ['program', id] });
      qc.removeQueries({ queryKey: ['program_assignments', 'program', id] });
      qc.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string } & ProgramUpdateInput): Promise<Program> => {
      const { id, ...patch } = args;
      const { data, error } = await supabase
        .from('programs')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as Program;
    },
    onSuccess: (updated) => {
      qc.setQueryData(['program', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['programs', updated.trainer_id] });
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

export function useProgram(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['program', id],
    queryFn: async (): Promise<Program | null> => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Program | null) ?? null;
    },
  });
}

interface ProgramClient {
  assignmentId: string;
  clientId: string;
  userId: string;
  goals: string | null;
  notes: string | null;
}

export function useProgramClients(programId: string | undefined) {
  return useQuery({
    enabled: !!programId,
    queryKey: ['program_assignments', 'program', programId],
    queryFn: async (): Promise<ProgramClient[]> => {
      const { data, error } = await supabase
        .from('program_assignments')
        .select('id, client_id, clients(user_id, goals, notes)')
        .eq('program_id', programId!);
      if (error) throw new Error(error.message);
      type Row = {
        id: string;
        client_id: string;
        clients: { user_id: string; goals: string | null; notes: string | null } | null;
      };
      return ((data ?? []) as unknown as Row[]).map((row) => ({
        assignmentId: row.id,
        clientId: row.client_id,
        userId: row.clients?.user_id ?? '',
        goals: row.clients?.goals ?? null,
        notes: row.clients?.notes ?? null,
      }));
    },
  });
}

export function useUnassignProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      assignmentId: string;
      programId: string;
      clientId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('program_assignments')
        .delete()
        .eq('id', args.assignmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_void, args) => {
      qc.invalidateQueries({ queryKey: ['program_assignments', 'program', args.programId] });
      qc.invalidateQueries({ queryKey: ['program_assignments', 'client', args.clientId] });
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
