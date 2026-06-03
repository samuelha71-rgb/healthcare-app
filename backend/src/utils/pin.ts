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

/** 관리자 응답 — 평문 보관본(pinPlain)이 있으면 그대로 노출, 없으면 해시 숨김 */
export function memberForAdminResponse<
  M extends { pin: string; pinPlain?: string | null },
>(member: M): Omit<M, 'pin' | 'pinPlain'> & { pin?: string; pinStoredSecurely: boolean } {
  const { pin, pinPlain, ...rest } = member;
  if (pinPlain) {
    return { ...rest, pin: pinPlain, pinStoredSecurely: false };
  }
  if (!isPinHashed(pin)) {
    // 레거시 평문 PIN — 그대로 노출
    return { ...rest, pin, pinStoredSecurely: false };
  }
  // 해시만 있음 — 평문 알 수 없음
  return { ...rest, pinStoredSecurely: true };
}
