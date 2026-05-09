import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** bcrypt 해시 여부 (DB에 평문 레거시와 구분) */
export function isPinHashed(stored: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(stored);
}

export async function hashPin(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPin(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false;
  if (isPinHashed(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}

/** 관리자 응답 — 해시된 PIN은 내용을 내려주지 않음 (프론트는 pinStoredSecurely로 표시) */
export function memberForAdminResponse<M extends { pin: string }>(
  member: M,
): Omit<M, 'pin'> & { pin?: string; pinStoredSecurely: boolean } {
  if (isPinHashed(member.pin)) {
    const { pin: _p, ...rest } = member;
    return { ...rest, pinStoredSecurely: true };
  }
  return { ...member, pinStoredSecurely: false };
}
