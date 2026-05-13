// 식단 기록 — 하루 한 건 (음식 항목 여러 개)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, memberIdFilter, requireAuth } from '../middleware/auth';

export const dietRouter = Router();

const itemInput = z.object({
  foodName: z.string().min(1),
  amount: z.enum(['적게', '적당히', '많이']),
  orderIndex: z.number().int().optional(),
});

const dietInput = z.object({
  memberId: z.number().int(),
  date: z.string().transform((s) => new Date(s)),
  note: z.string().optional().nullable(),
  items: z.array(itemInput),
});

dietRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? (req.query.memberId ? Number(req.query.memberId) : undefined);
    const logs = await prisma.dietLog.findMany({
      where: { ...(memberId && { memberId }) },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { date: 'asc' },
    });
    res.json(logs);
  }),
);

dietRouter.get(
  '/by-date',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? Number(req.query.memberId);
    if (!memberId) throw new HttpError(400, 'memberId required');
    ensureSelfOrAdmin(req, memberId);
    const date = new Date(String(req.query.date));
    const log = await prisma.dietLog.findUnique({
      where: { memberId_date: { memberId, date } },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
    res.json(log);
  }),
);

// upsert + 아이템은 통째로 교체
dietRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { items, ...data } = dietInput.parse(req.body);
    ensureSelfOrAdmin(req, data.memberId);

    const log = await prisma.$transaction(async (tx) => {
      const upserted = await tx.dietLog.upsert({
        where: { memberId_date: { memberId: data.memberId, date: data.date } },
        create: { ...data },
        update: { note: data.note ?? null },
      });
      await tx.dietItem.deleteMany({ where: { dietLogId: upserted.id } });
      if (items.length > 0) {
        await tx.dietItem.createMany({
          data: items.map((it, i) => ({
            dietLogId: upserted.id,
            foodName: it.foodName,
            amount: it.amount,
            orderIndex: it.orderIndex ?? i,
          })),
        });
      }
      return tx.dietLog.findUnique({
        where: { id: upserted.id },
        include: { items: { orderBy: { orderIndex: 'asc' } } },
      });
    });

    res.status(201).json(log);
  }),
);

dietRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.dietLog.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Not found');
    ensureSelfOrAdmin(req, existing.memberId);
    await prisma.dietLog.delete({ where: { id } });
    res.status(204).end();
  }),
);
