import { api } from './client';
import type { DietLog, DietItem } from '@/types';

export interface DietInput {
  memberId: number;
  date: string;
  breakfast?: boolean;
  lunch?: boolean;
  dinner?: boolean;
  note?: string | null;
  items?: DietItem[]; // 신규 UI는 안 보냄
}

export const dietApi = {
  list: (memberId?: number) =>
    api.get<DietLog[]>('/diet', { params: { memberId } }).then((r) => r.data),
  byDate: (memberId: number, date: string) =>
    api.get<DietLog | null>('/diet/by-date', { params: { memberId, date } }).then((r) => r.data),
  save: (data: DietInput) => api.post<DietLog>('/diet', data).then((r) => r.data),
  remove: (id: number) => api.delete(`/diet/${id}`).then(() => null),
};
