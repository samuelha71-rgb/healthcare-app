// 수면 기록 — 하루 한 건 (upsert)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, memberIdFilter, requireAuth } from '../middleware/auth';

export const sleepRouter = Router();

const sleepInput = z.object({
  memberId: z.number().int(),
  date: z.string().transform((s) => new Date(s)),
  hours: z.number().positive().max(24),
  note: z.string().optional().nullable(),
});

sleepRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? (req.query.memberId ? Number(req.query.memberId) : undefined);
    const logs = await prisma.sleepLog.findMany({
      where: { ...(memberId && { memberId }) },
      orderBy: { date: 'asc' },
    });
    res.json(logs);
  }),
);

// 한 날짜의 기록 조회 (입력 폼 초기값용)
sleepRouter.get(
  '/by-date',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? Number(req.query.memberId);
    if (!memberId) throw new HttpError(400, 'memberId required');
    ensureSelfOrAdmin(req, memberId);
    const date = new Date(String(req.query.date));
    // 같은 날짜로 저장된 행 (중복은 unique 제약상 1건)
    const log = await prisma.sleepLog.findUnique({
      where: { memberId_date: { memberId, date } },
    });
    res.json(log);
  }),
);

// upsert — memberId+date 기준
sleepRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = sleepInput.parse(req.body);
    ensureSelfOrAdmin(req, data.memberId);
    const log = await prisma.sleepLog.upsert({
      where: { memberId_date: { memberId: data.memberId, date: data.date } },
      create: data,
      update: { hours: data.hours, note: data.note ?? null },
    });
    res.status(201).json(log);
  }),
);

sleepRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.sleepLog.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Not found');
    ensureSelfOrAdmin(req, existing.memberId);
    await prisma.sleepLog.delete({ where: { id } });
    res.status(204).end();
  }),
);
