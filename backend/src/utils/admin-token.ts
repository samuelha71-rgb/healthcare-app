import crypto from 'crypto';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error('ADMIN_PASSWORD is not configured');
  return pw;
}

/** localStorage에 비밀번호 대신 서명 토큰만 저장 */
export function createAdminToken(): string {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + TTL_MS });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyAdminToken(token: string): boolean {
  const dot = token.indexOf('.');
  if (dot <= 0) return false;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');

  try {
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    if (payload.role !== 'admin') return false;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/** 이전 버전 토큰(admin:평문비번) — 재로그인 전까지 호환 */
export function verifyLegacyAdminToken(token: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  return !!pw && token === pw;
}
