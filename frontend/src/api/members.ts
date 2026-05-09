import { api } from './client';
import type { Member, MemberDetail, WorkoutLog } from '@/types';

export const membersApi = {
  list: () => api.get<Member[]>('/members').then((r) => r.data),
  get: (id: number) => api.get<MemberDetail>(`/members/${id}`).then((r) => r.data),
  create: (data: Partial<Member>) => api.post<Member>('/members', data).then((r) => r.data),
  update: (id: number, data: Partial<Member>) =>
    api.patch<Member>(`/members/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/members/${id}`).then(() => null),
  attendance: (id: number) =>
    api
      .get<Pick<WorkoutLog, 'date' | 'condition' | 'rpe'>[]>(`/members/${id}/attendance`)
      .then((r) => r.data),
};
