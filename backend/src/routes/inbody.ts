// 인바디 기록 CRUD
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, memberIdFilter, requireAuth } from '../middleware/auth';

export const inbodyRouter = Router();

const inbodyInput = z.object({
  memberId: z.number().int(),
  date: z.string().transform((s) => new Date(s)),
  weight: z.number().positive().optional().nullable(),
  bodyFat: z.number().nonnegative().optional().nullable(),
  muscleMass: z.number().nonnegative().optional().nullable(),
  bmi: z.number().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});

inbodyRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? (req.query.memberId ? Number(req.query.memberId) : undefined);
    const records = await prisma.inbodyRecord.findMany({
      where: { ...(memberId && { memberId }) },
      orderBy: { date: 'asc' },
    });
    res.json(records);
  }),
);

inbodyRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const r = await prisma.inbodyRecord.findUnique({ where: { id } });
    if (!r) throw new HttpError(404, 'Record not found');
    ensureSelfOrAdmin(req, r.memberId);
    res.json(r);
  }),
);

inbodyRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = inbodyInput.parse(req.body);
    ensureSelfOrAdmin(req, data.memberId);
    const record = await prisma.inbodyRecord.create({ data });
    res.status(201).json(record);
  }),
);

inbodyRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.inbodyRecord.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Record not found');
    ensureSelfOrAdmin(req, existing.memberId);
    const data = inbodyInput.partial().parse(req.body);
    const record = await prisma.inbodyRecord.update({ where: { id }, data });
    res.json(record);
  }),
);

inbodyRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.inbodyRecord.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Record not found');
    ensureSelfOrAdmin(req, existing.memberId);
    await prisma.inbodyRecord.delete({ where: { id } });
    res.status(204).end();
  }),
);
