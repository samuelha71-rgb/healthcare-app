// 일일 운동 기록 (WorkoutLog + ExerciseSet)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, memberIdFilter, requireAuth } from '../middleware/auth';

export const workoutLogsRouter = Router();

const setInput = z.object({
  exerciseName: z.string().min(1),
  setNumber: z.number().int().positive(),
  weight: z.number().nonnegative().optional().nullable(),
  reps: z.number().int().nonnegative().optional().nullable(),
});

const logInput = z.object({
  memberId: z.number().int(),
  date: z.string().transform((s) => new Date(s)),
  condition: z.number().int().min(1).max(5).optional().nullable(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  painArea: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  sets: z.array(setInput).optional(),
});

workoutLogsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    // 학생이면 본인 ID로 강제 필터
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? (req.query.memberId ? Number(req.query.memberId) : undefined);

    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const logs = await prisma.workoutLog.findMany({
      where: {
        ...(memberId && { memberId }),
        ...(from || to
          ? { date: { ...(from && { gte: from }), ...(to && { lte: to }) } }
          : {}),
      },
      include: { sets: true },
      orderBy: { date: 'desc' },
    });
    res.json(logs);
  }),
);

workoutLogsRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const log = await prisma.workoutLog.findUnique({
      where: { id },
      include: { sets: true, member: true },
    });
    if (!log) throw new HttpError(404, 'Log not found');
    ensureSelfOrAdmin(req, log.memberId);
    res.json(log);
  }),
);

workoutLogsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { sets = [], ...data } = logInput.parse(req.body);
    ensureSelfOrAdmin(req, data.memberId);
    const log = await prisma.workoutLog.create({
      data: { ...data, sets: { create: sets } },
      include: { sets: true },
    });
    res.status(201).json(log);
  }),
);

workoutLogsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.workoutLog.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Log not found');
    ensureSelfOrAdmin(req, existing.memberId);

    const { sets, ...data } = logInput.partial().parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.workoutLog.update({ where: { id }, data });
      if (sets) {
        await tx.exerciseSet.deleteMany({ where: { workoutLogId: id } });
        await tx.exerciseSet.createMany({
          data: sets.map((s) => ({ ...s, workoutLogId: id })),
        });
      }
      return tx.workoutLog.findUnique({ where: { id }, include: { sets: true } });
    });

    res.json(updated);
  }),
);

workoutLogsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prisma.workoutLog.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, 'Log not found');
    ensureSelfOrAdmin(req, existing.memberId);
    await prisma.workoutLog.delete({ where: { id } });
    res.status(204).end();
  }),
);
