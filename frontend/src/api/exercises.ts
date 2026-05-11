import { api } from './client';
import type { Exercise } from '@/types';

export interface ExerciseInput {
  name: string;
  bodyPart?: string | null;
  instructions?: string | null;
  cautions?: string | null;
}

export const exercisesApi = {
  list: (bodyPart?: string) =>
    api.get<Exercise[]>('/exercises', { params: { bodyPart } }).then((r) => r.data),
  get: (id: number) => api.get<Exercise>(`/exercises/${id}`).then((r) => r.data),
  create: (data: ExerciseInput) =>
    api.post<Exercise>('/exercises', data).then((r) => r.data),
  update: (id: number, data: Partial<ExerciseInput>) =>
    api.patch<Exercise>(`/exercises/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/exercises/${id}`).then(() => null),
};
