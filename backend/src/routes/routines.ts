// 루틴 CRUD + 운동 항목 관리 + 대상 배정
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const routinesRouter = Router();

const exerciseInput = z.object({
  exerciseName: z.string().min(1),
  targetSets: z.number().int().positive().optional().nullable(),
  targetReps: z.number().int().positive().optional().nullable(),
  targetWeight: z.number().positive().optional().nullable(),
  instructions: z.string().optional().nullable(),
  cautions: z.string().optional().nullable(),
  orderIndex: z.number().int().optional(),
});

const routineInput = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).default([]),
  instructions: z.string().optional().nullable(),
  cautions: z.string().optional().nullable(),
  exercises: z.array(exerciseInput).optional(),
});

// 목록 — 학생은 자기에게 배정된 루틴만
routinesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth?.role === 'student') {
      const routines = await prisma.routine.findMany({
        where: { assignments: { some: { memberId: req.auth.memberId } } },
        include: { exercises: { orderBy: { orderIndex: 'asc' } } },
        orderBy: { id: 'asc' },
      });
      res.json(routines);
      return;
    }
    const routines = await prisma.routine.findMany({
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { id: 'asc' },
    });
    res.json(routines);
  }),
);

routinesRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const routine = await prisma.routine.findUnique({
      where: { id },
      include: {
        exercises: { orderBy: { orderIndex: 'asc' } },
        assignments: { include: { member: true } },
      },
    });
    if (!routine) throw new HttpError(404, 'Routine not found');
    if (req.auth?.role === 'student') {
      const studentId = req.auth.memberId;
      const assigned = routine.assignments.some((a) => a.memberId === studentId);
      if (!assigned) throw new HttpError(403, 'Forbidden');
    }
    res.json(routine);
  }),
);

routinesRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { exercises = [], ...data } = routineInput.parse(req.body);
    const routine = await prisma.routine.create({
      data: { ...data, exercises: { create: exercises } },
      include: { exercises: true },
    });
    res.status(201).json(routine);
  }),
);

routinesRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { exercises, ...data } = routineInput.partial().parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.routine.update({ where: { id }, data });
      if (exercises) {
        await tx.routineExercise.deleteMany({ where: { routineId: id } });
        await tx.routineExercise.createMany({
          data: exercises.map((e, i) => ({
            ...e,
            routineId: id,
            orderIndex: e.orderIndex ?? i,
          })),
        });
      }
      return tx.routine.findUnique({
        where: { id: r.id },
        include: { exercises: { orderBy: { orderIndex: 'asc' } } },
      });
    });

    res.json(updated);
  }),
);

routinesRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.routine.delete({ where: { id } });
    res.status(204).end();
  }),
);

routinesRouter.post(
  '/:id/assign',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const routineId = Number(req.params.id);
    const memberId = z.number().int().parse(req.body.memberId);
    const assignment = await prisma.routineAssignment.upsert({
      where: { memberId_routineId: { memberId, routineId } },
      create: { memberId, routineId },
      update: {},
    });
    res.status(201).json(assignment);
  }),
);

routinesRouter.delete(
  '/:id/assign/:memberId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const routineId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    await prisma.routineAssignment.delete({
      where: { memberId_routineId: { memberId, routineId } },
    });
    res.status(204).end();
  }),
);
