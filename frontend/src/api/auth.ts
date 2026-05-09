import { api } from './client';

export const authApi = {
  studentOptions: () =>
    api.get<{ id: number; name: string }[]>('/auth/students').then((r) => r.data),
};
