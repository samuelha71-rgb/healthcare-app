import { api } from './client';
import type { Goal } from '@/types';

export interface GoalInput {
  memberId: number;
  type: Goal['type'];
  description: string;
  targetValue?: number | null;
  currentValue?: number | null;
  deadline?: string | null;
  achieved?: boolean;
}

export const goalsApi = {
  list: (memberId?: number) =>
    api.get<Goal[]>('/goals', { params: { memberId } }).then((r) => r.data),
  create: (data: GoalInput) => api.post<Goal>('/goals', data).then((r) => r.data),
  update: (id: number, data: Partial<GoalInput>) =>
    api.patch<Goal>(`/goals/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/goals/${id}`).then(() => null),
};
