// 통계 — 누구나(로그인된 사용자) 볼 수 있는 요약 비교
// 개별 기록 상세는 노출하지 않고 카운트/평균만
import { Router } from 'express';
import { prisma } from '../prisma';
import { asyncHandler } from '../middleware/error';
import { requireAuth } from '../middleware/auth';

export const statsRouter = Router();

statsRouter.get(
  '/comparison',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const members = await prisma.member.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const logs = await prisma.workoutLog.findMany({
      select: { memberId: true, date: true, rpe: true },
    });

    // 멤버별로 집계
    const byMember = new Map<
      number,
      { dates: Set<string>; rpeSum: number; rpeCount: number }
    >();
    for (const m of members) {
      byMember.set(m.id, { dates: new Set(), rpeSum: 0, rpeCount: 0 });
    }
    for (const l of logs) {
      const slot = byMember.get(l.memberId);
      if (!slot) continue;
      slot.dates.add(l.date.toISOString().slice(0, 10));
      if (l.rpe) {
        slot.rpeSum += l.rpe;
        slot.rpeCount += 1;
      }
    }

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const result = members.map((m) => {
      const slot = byMember.get(m.id)!;
      const dates = slot.dates;

      // 최근 7일/30일 카운트
      let recent7 = 0;
      let recent30 = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        if (dates.has(d.toISOString().slice(0, 10))) {
          recent30++;
          if (i < 7) recent7++;
        }
      }

      // 연속 출석 (오늘 또는 어제부터 거꾸로)
      let streak = 0;
      const startToday = dates.has(todayStr);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      if (startToday || dates.has(yStr)) {
        const cursor = new Date(startToday ? today : yesterday);
        while (dates.has(cursor.toISOString().slice(0, 10))) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
      }

      const avgRpe = slot.rpeCount
        ? Math.round((slot.rpeSum / slot.rpeCount) * 10) / 10
        : 0;

      return {
        memberId: m.id,
        name: m.name,
        recent7,
        recent30,
        streak,
        total: dates.size,
        avgRpe,
      };
    });

    res.json(result);
  }),
);
