// 목표 CRUD
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, memberIdFilter, requireAuth } from '../middleware/auth';

export const goalsRouter = Router();

const goalInput = z.object({
  memberId: z.number().int(),
  type: z.enum(['weight', 'bodyFat', 'muscleMass', 'lift', 'custom']),
  description: z.string().min(1),
  targetValue: z.number().optional().nullable(),
  currentValue: z.number().optional().nullable(),
  deadline: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s ? new Date(s) : null)),
  achieved: z.boolean().optional(),
});

goalsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? (req.query.memberId ? Number(req.query.memberId) : undefined);
    const goals = await prisma.goal.findMany({
      where: { ...(memberId && { memberId }) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  }),
);

goalsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = goalInput.parse(req.body);
    ensureSelfOrAdmin(req, data.memberId);
    const goal = await prisma.goal.create({ data });
    res.status(201).json(goal);
  }),
);

goalsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Goal not found');
    ensureSelfOrAdmin(req, existing.memberId);
    const data = goalInput.partial().parse(req.body);
    const goal = await prisma.goal.update({ where: { id }, data });
    res.json(goal);
  }),
);

goalsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Goal not found');
    ensureSelfOrAdmin(req, existing.memberId);
    await prisma.goal.delete({ where: { id } });
    res.status(204).end();
  }),
);
