import { api } from './client';
import type { SleepLog } from '@/types';

export const sleepApi = {
  list: (memberId?: number) =>
    api.get<SleepLog[]>('/sleep', { params: { memberId } }).then((r) => r.data),
  byDate: (memberId: number, date: string) =>
    api.get<SleepLog | null>('/sleep/by-date', { params: { memberId, date } }).then((r) => r.data),
  save: (data: { memberId: number; date: string; hours: number; note?: string | null }) =>
    api.post<SleepLog>('/sleep', data).then((r) => r.data),
  remove: (id: number) => api.delete(`/sleep/${id}`).then(() => null),
};
