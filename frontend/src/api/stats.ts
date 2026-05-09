import { api } from './client';

export interface ComparisonRow {
  memberId: number;
  name: string;
  recent7: number;
  recent30: number;
  streak: number;
  total: number;
  avgRpe: number;
}

export const statsApi = {
  comparison: () =>
    api.get<ComparisonRow[]>('/stats/comparison').then((r) => r.data),
};
