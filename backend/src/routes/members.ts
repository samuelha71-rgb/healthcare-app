// 대상(Member) CRUD + 상세 통계
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, requireAdmin, requireAuth } from '../middleware/auth';
import { hashPin, memberForAdminResponse } from '../utils/pin';

export const membersRouter = Router();

const memberInput = z.object({
  name: z.string().min(1),
  pin: z.string().min(2).max(20).optional(),
  age: z.number().int().positive().optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  height: z.number().positive().optional().nullable(),
  memo: z.string().optional().nullable(),
});

// 목록 — 관리자 전용
membersRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const members = await prisma.member.findMany({ orderBy: { joinedAt: 'asc' } });
    res.json(members.map((m) => memberForAdminResponse(m)));
  }),
);

// 상세 — 관리자 OR 본인
membersRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    ensureSelfOrAdmin(req, id);
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        goals: true,
        routineAssignments: {
          include: {
            routine: {
              include: {
                exercises: {
                  orderBy: { orderIndex: 'asc' },
                  include: { exercise: true },
                },
              },
            },
          },
        },
      },
    });
    if (!member) throw new HttpError(404, 'Member not found');

    const [logCount, lastLog, inbodyCount, photoCount] = await Promise.all([
      prisma.workoutLog.count({ where: { memberId: id } }),
      prisma.workoutLog.findFirst({ where: { memberId: id }, orderBy: { date: 'desc' } }),
      prisma.inbodyRecord.count({ where: { memberId: id } }),
      prisma.photo.count({ where: { memberId: id } }),
    ]);

    // PIN은 학생 응답에서 제외 (관리자에게만 표시 — 해시 저장 시에는 내용 미표시)
    const { pin, ...rest } = member;
    const adminPayload = memberForAdminResponse(member);
    res.json({
      ...(req.auth?.role === 'admin' ? adminPayload : rest),
      stats: { logCount, lastLog, inbodyCount, photoCount },
    });
  }),
);

// 생성 — 관리자 전용 (PIN 필수)
membersRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = memberInput.required({ pin: true }).parse(req.body);
    const member = await prisma.member.create({
      data: { ...data, pin: await hashPin(data.pin) },
    });
    res.status(201).json(memberForAdminResponse(member));
  }),
);

// 수정 — 관리자 전용
membersRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const parsed = memberInput.partial().parse(req.body);
    const data =
      parsed.pin !== undefined
        ? { ...parsed, pin: parsed.pin ? await hashPin(parsed.pin) : parsed.pin }
        : parsed;
    const member = await prisma.member.update({ where: { id }, data });
    res.json(memberForAdminResponse(member));
  }),
);

// 삭제 — 관리자 전용
membersRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.member.delete({ where: { id } });
    res.status(204).end();
  }),
);

// 출석 — 관리자 OR 본인
membersRouter.get(
  '/:id/attendance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    ensureSelfOrAdmin(req, id);
    const logs = await prisma.workoutLog.findMany({
      where: { memberId: id },
      select: { date: true, condition: true, rpe: true },
      orderBy: { date: 'asc' },
    });
    res.json(logs);
  }),
);
