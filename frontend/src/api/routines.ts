import { api } from './client';
import type { Routine } from '@/types';

export interface RoutineInput {
  name: string;
  description?: string | null;
  weekday: number;
  instructions?: string | null;
  cautions?: string | null;
  exercises?: Array<{
    exerciseName: string;
    targetSets?: number | null;
    targetReps?: number | null;
    targetWeight?: number | null;
    instructions?: string | null;
    cautions?: string | null;
    orderIndex?: number;
  }>;
}

export const routinesApi = {
  list: () => api.get<Routine[]>('/routines').then((r) => r.data),
  get: (id: number) => api.get<Routine>(`/routines/${id}`).then((r) => r.data),
  create: (data: RoutineInput) => api.post<Routine>('/routines', data).then((r) => r.data),
  update: (id: number, data: Partial<RoutineInput>) =>
    api.patch<Routine>(`/routines/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/routines/${id}`).then(() => null),
  assign: (routineId: number, memberId: number) =>
    api.post(`/routines/${routineId}/assign`, { memberId }).then((r) => r.data),
  unassign: (routineId: number, memberId: number) =>
    api.delete(`/routines/${routineId}/assign/${memberId}`).then(() => null),
};
