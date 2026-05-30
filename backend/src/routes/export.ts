// 관리자용 — 전체 데이터를 JSON으로 다운로드 (백업)
import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const exportRouter = Router();

exportRouter.get(
  '/all',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const withPhotos = req.query.withPhotos === '1';

    const [
      members,
      routines,
      exercises,
      workoutLogs,
      inbodyRecords,
      photos,
      goals,
      sleepLogs,
      dietLogs,
    ] = await Promise.all([
      prisma.member.findMany(),
      prisma.routine.findMany({ include: { exercises: true, assignments: true } }),
      prisma.exercise.findMany(),
      prisma.workoutLog.findMany({ include: { sets: true } }),
      prisma.inbodyRecord.findMany(),
      withPhotos
        ? prisma.photo.findMany()
        : prisma.photo.findMany({
            select: {
              id: true,
              memberId: true,
              date: true,
              mime: true,
              caption: true,
              createdAt: true,
            },
          }),
      prisma.goal.findMany(),
      prisma.sleepLog.findMany(),
      prisma.dietLog.findMany({ include: { items: { orderBy: { orderIndex: 'asc' } } } }),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      photosIncludeData: withPhotos,
      members,
      routines,
      exercises,
      workoutLogs,
      inbodyRecords,
      photos,
      goals,
      sleepLogs,
      dietLogs,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="healthcare-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.send(JSON.stringify(data, null, 2));
  }),
);
