// 운동 라이브러리 — 부위별 모음
// GET: 모든 로그인 사용자 (학생/관리자) — 헬스장에서 참고용
// POST/PATCH/DELETE: 관리자 전용
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const exercisesRouter = Router();

const exerciseInput = z.object({
  name: z.string().min(1),
  bodyPart: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  cautions: z.string().optional().nullable(),
});

exercisesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bodyPart = req.query.bodyPart ? String(req.query.bodyPart) : undefined;
    const exercises = await prisma.exercise.findMany({
      where: { ...(bodyPart && { bodyPart }) },
      orderBy: [{ bodyPart: 'asc' }, { name: 'asc' }],
    });
    res.json(exercises);
  }),
);

exercisesRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ex = await prisma.exercise.findUnique({ where: { id } });
    if (!ex) throw new HttpError(404, 'Exercise not found');
    res.json(ex);
  }),
);

exercisesRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = exerciseInput.parse(req.body);
    const ex = await prisma.exercise.create({ data });
    res.status(201).json(ex);
  }),
);

exercisesRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = exerciseInput.partial().parse(req.body);
    const ex = await prisma.exercise.update({ where: { id }, data });
    res.json(ex);
  }),
);

exercisesRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.exercise.delete({ where: { id } });
    res.status(204).end();
  }),
);
