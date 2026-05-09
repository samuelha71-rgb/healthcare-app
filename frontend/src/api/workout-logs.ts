import { api } from './client';
import type { WorkoutLog } from '@/types';

export interface LogInput {
  memberId: number;
  date: string;
  condition?: number | null;
  rpe?: number | null;
  painArea?: string | null;
  note?: string | null;
  sets?: Array<{
    exerciseName: string;
    setNumber: number;
    weight?: number | null;
    reps?: number | null;
  }>;
}

export const workoutLogsApi = {
  list: (params?: { memberId?: number; from?: string; to?: string }) =>
    api.get<WorkoutLog[]>('/workout-logs', { params }).then((r) => r.data),
  get: (id: number) => api.get<WorkoutLog>(`/workout-logs/${id}`).then((r) => r.data),
  create: (data: LogInput) => api.post<WorkoutLog>('/workout-logs', data).then((r) => r.data),
  update: (id: number, data: Partial<LogInput>) =>
    api.patch<WorkoutLog>(`/workout-logs/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/workout-logs/${id}`).then(() => null),
};
