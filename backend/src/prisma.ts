// Prisma 클라이언트 인스턴스 — 앱 전체에서 하나만 공유
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
