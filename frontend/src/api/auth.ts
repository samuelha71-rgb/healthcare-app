import { api } from './client';

const classAccessCode = import.meta.env.VITE_CLASS_ACCESS_CODE as string | undefined;

function classAccessParams() {
  if (!classAccessCode?.trim()) return {};
  return {
    params: { accessCode: classAccessCode.trim() },
    headers: { 'x-class-access-code': classAccessCode.trim() },
  };
}

export const authApi = {
  studentOptions: () =>
    api
      .get<{ id: number; name: string }[]>('/auth/students', classAccessParams())
      .then((r) => r.data),
};
