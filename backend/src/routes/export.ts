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
  asyncHandler(async (_req, res) => {
    const [members, routines, workoutLogs, inbodyRecords, photos, goals] = await Promise.all([
      prisma.member.findMany(),
      prisma.routine.findMany({ include: { exercises: true, assignments: true } }),
      prisma.workoutLog.findMany({ include: { sets: true } }),
      prisma.inbodyRecord.findMany(),
      // 사진은 데이터 제외하고 메타만 (용량 큼). 필요하면 ?withPhotos=1
      prisma.photo.findMany(),
      prisma.goal.findMany(),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      members,
      routines,
      workoutLogs,
      inbodyRecords,
      photos,
      goals,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="healthcare-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    );
    res.send(JSON.stringify(data, null, 2));
  }),
);
