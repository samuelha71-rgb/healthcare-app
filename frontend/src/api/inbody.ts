import { api } from './client';
import type { InbodyRecord } from '@/types';

export interface InbodyInput {
  memberId: number;
  date: string;
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  bmi?: number | null;
  note?: string | null;
}

export const inbodyApi = {
  list: (memberId?: number) =>
    api
      .get<InbodyRecord[]>('/inbody', { params: { memberId } })
      .then((r) => r.data),
  create: (data: InbodyInput) => api.post<InbodyRecord>('/inbody', data).then((r) => r.data),
  update: (id: number, data: Partial<InbodyInput>) =>
    api.patch<InbodyRecord>(`/inbody/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/inbody/${id}`).then(() => null),
};
