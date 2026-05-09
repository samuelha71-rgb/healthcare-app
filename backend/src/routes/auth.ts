// 로그인 + 학생 목록 (로그인 화면용)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { hashPin, isPinHashed, verifyPin } from '../utils/pin';

export const authRouter = Router();

// 로그인 화면용 — 이름 + ID만 (PIN 노출 안함)
authRouter.get(
  '/students',
  asyncHandler(async (_req, res) => {
    const members = await prisma.member.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(members);
  }),
);

// 관리자 로그인
authRouter.post(
  '/admin',
  asyncHandler(async (req, res) => {
    const { password } = z.object({ password: z.string() }).parse(req.body);
    if (password !== process.env.ADMIN_PASSWORD) {
      throw new HttpError(401, '비밀번호가 틀렸습니다');
    }
    res.json({ token: `admin:${password}`, role: 'admin' as const });
  }),
);

// 학생 로그인
authRouter.post(
  '/student',
  asyncHandler(async (req, res) => {
    const { memberId, pin } = z
      .object({ memberId: z.number().int(), pin: z.string() })
      .parse(req.body);
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || !(await verifyPin(pin, member.pin))) {
      throw new HttpError(401, 'PIN이 틀렸습니다');
    }
    if (!isPinHashed(member.pin)) {
      await prisma.member.update({
        where: { id: memberId },
        data: { pin: await hashPin(pin) },
      });
    }
    res.json({
      token: `student:${memberId}:${pin}`,
      role: 'student' as const,
      memberId,
      name: member.name,
    });
  }),
);

// 토큰 검증 (페이지 새로고침 시 사용)
authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new HttpError(401, 'Not authenticated');
    if (req.auth.role === 'admin') {
      res.json({ role: 'admin' });
      return;
    }
    const member = await prisma.member.findUnique({
      where: { id: req.auth.memberId },
      select: { id: true, name: true },
    });
    if (!member) throw new HttpError(401, 'Member not found');
    res.json({ role: 'student', memberId: member.id, name: member.name });
  }),
);
