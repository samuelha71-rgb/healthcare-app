import type { Request } from 'express';
import { HttpError } from '../middleware/error';

/** CLASS_ACCESS_CODE가 설정된 경우에만 학생 목록 등에 접근 코드 요구 */
export function assertClassAccess(req: Request) {
  const expected = process.env.CLASS_ACCESS_CODE?.trim();
  if (!expected) return;

  const provided =
    req.header('x-class-access-code') ??
    (typeof req.query.accessCode === 'string' ? req.query.accessCode : undefined);

  if (provided !== expected) {
    throw new HttpError(403, '접근 코드가 필요합니다');
  }
}
