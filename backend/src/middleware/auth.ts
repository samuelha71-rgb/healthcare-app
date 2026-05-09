// 인증 미들웨어
//
// 토큰 형식 (헤더 x-auth-token에 담아 보냄):
//   "admin:<관리자비번>"  → 관리자
//   "student:<id>:<pin>"  → 학생 (자기 데이터만 접근 가능)
//
// req.auth 에 인증 정보가 들어가고, 각 라우트에서 권한을 검사합니다.
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma';
import { HttpError } from './error';
import { hashPin, isPinHashed, verifyPin } from '../utils/pin';

export type Auth =
  | { role: 'admin' }
  | { role: 'student'; memberId: number };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: Auth;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.header('x-auth-token');
  if (!token) return next();

  try {
    if (token.startsWith('admin:')) {
      const pw = token.slice('admin:'.length);
      if (pw === process.env.ADMIN_PASSWORD) {
        req.auth = { role: 'admin' };
      }
    } else if (token.startsWith('student:')) {
      const parts = token.split(':');
      if (parts.length < 3) {
        next();
        return;
      }
      const idStr = parts[1];
      const pin = parts.slice(2).join(':');
      const id = Number(idStr);
      if (id && pin) {
        const member = await prisma.member.findUnique({ where: { id } });
        if (member && (await verifyPin(pin, member.pin))) {
          if (!isPinHashed(member.pin)) {
            await prisma.member.update({
              where: { id },
              data: { pin: await hashPin(pin) },
            });
          }
          req.auth = { role: 'student', memberId: id };
        }
      }
    }
  } catch {
    // 토큰 파싱 실패 — 그냥 인증 없음으로 처리
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) throw new HttpError(401, 'Authentication required');
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== 'admin') throw new HttpError(403, 'Admin only');
  next();
}

// 자신의 데이터에만 접근 가능 — memberId가 일치하거나 admin
export function ensureSelfOrAdmin(req: Request, memberId: number) {
  if (!req.auth) throw new HttpError(401, 'Authentication required');
  if (req.auth.role === 'admin') return;
  if (req.auth.memberId !== memberId) throw new HttpError(403, 'Forbidden');
}

// 학생인 경우 자기 데이터만 보이도록 자동 필터에 쓰는 memberId
export function memberIdFilter(req: Request): number | undefined {
  if (req.auth?.role === 'student') return req.auth.memberId;
  return undefined;
}
