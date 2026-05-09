import { api } from './client';
import type { Photo } from '@/types';

export const photosApi = {
  list: (memberId?: number) =>
    api.get<Photo[]>('/photos', { params: { memberId } }).then((r) => r.data),
  upload: (data: {
    memberId: number;
    date: string;
    caption?: string;
    data: string;
    mime: string;
  }) => api.post<Photo>('/photos', data).then((r) => r.data),
  remove: (id: number) => api.delete(`/photos/${id}`).then(() => null),
};
