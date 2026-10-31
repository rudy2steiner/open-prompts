import { createHmac, timingSafeEqual } from 'node:crypto';

export type CreditsLimits = {
  daily: number | null;
  monthly: number | null;
};

export type CreditsUsage = {
  userId?: string;
  day: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  dayUsed: number;
  monthUsed: number;
};

const COOKIE_NAME = 'op_credits_v1';

function clampNonNegInt(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

function todayParts(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { day: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` };
}

export function getInternalCreditsLimitsFromEnv(): CreditsLimits {
  const daily = clampNonNegInt((process.env.INTERNAL_DAILY_IMAGE_CREDITS || '').trim());
  const monthly = clampNonNegInt((process.env.INTERNAL_MONTHLY_IMAGE_CREDITS || '').trim());
  return {
    daily: daily > 0 ? daily : null,
    monthly: monthly > 0 ? monthly : null,
  };
}

function getCookieSecret(): string {
  const s = String(process.env.CREDITS_COOKIE_SECRET || '').trim();
  if (s) return s;

  // In dev/test, don't crash the whole request path if the secret
  // isn't configured yet. Use an ephemeral-ish fallback.
  // In production, keep it required to prevent trivial tampering.
  const env = String(process.env.NODE_ENV || '').toLowerCase();
  if (env !== 'production') return `dev-secret:${process.env.NEXT_PUBLIC_SITE_URL || 'local'}`;

  throw new Error('Missing CREDITS_COOKIE_SECRET');
}

function b64urlEncode(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function b64urlDecode(input: string) {
  const s = input.replaceAll('-', '+').replaceAll('_', '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64');
}

function sign(payloadB64: string): string {
  const mac = createHmac('sha256', getCookieSecret()).update(payloadB64).digest();
  return b64urlEncode(mac);
}

export function getCreditsCookieName() {
  return COOKIE_NAME;
}

export function parseCreditsCookie(
  cookieValue: string | null,
  opts?: { userId?: string; now?: Date }
): CreditsUsage {
  const now = opts?.now ?? new Date();
  const expectedUserId = opts?.userId?.trim() || '';
  const { day, month } = todayParts(now);
  if (!cookieValue) return { day, month, dayUsed: 0, monthUsed: 0 };

  try {
    const [payloadB64, sig] = cookieValue.split('.');
    if (!payloadB64 || !sig) return { day, month, dayUsed: 0, monthUsed: 0 };

    const expected = sign(payloadB64);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { day, month, dayUsed: 0, monthUsed: 0 };

    const payloadRaw = b64urlDecode(payloadB64).toString('utf8');
    const parsed = JSON.parse(payloadRaw);
    const userId = typeof parsed?.userId === 'string' ? parsed.userId : '';
    if (expectedUserId && userId && userId !== expectedUserId) {
      return { userId: expectedUserId, day, month, dayUsed: 0, monthUsed: 0 };
    }

    const prevDay = typeof parsed?.day === 'string' ? parsed.day : '';
    const prevMonth = typeof parsed?.month === 'string' ? parsed.month : '';
    const prevDayUsed = clampNonNegInt(parsed?.dayUsed);
    const prevMonthUsed = clampNonNegInt(parsed?.monthUsed);

    return {
      userId: expectedUserId || userId || undefined,
      day,
      month,
      dayUsed: prevDay === day ? prevDayUsed : 0,
      monthUsed: prevMonth === month ? prevMonthUsed : 0,
    };
  } catch {
    return { userId: expectedUserId || undefined, day, month, dayUsed: 0, monthUsed: 0 };
  }
}

export function serializeCreditsCookie(
  usage: CreditsUsage,
  opts?: { secure?: boolean; maxAgeSeconds?: number }
): string {
  const payload = JSON.stringify(usage);
  const payloadB64 = b64urlEncode(payload);
  const sig = sign(payloadB64);
  const value = `${payloadB64}.${sig}`;

  const parts = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    opts?.secure ? 'Secure' : '',
    `Max-Age=${String(opts?.maxAgeSeconds ?? 60 * 60 * 24 * 400)}`, // ~400 days
  ].filter(Boolean);
  return parts.join('; ');
}

export function canConsumeCredits(
  limits: CreditsLimits,
  usage: CreditsUsage,
  amount: number
): { ok: boolean; reason?: 'daily' | 'monthly' } {
  const n = clampNonNegInt(amount);
  if (n <= 0) return { ok: true };
  if (limits.daily != null && usage.dayUsed + n > limits.daily) return { ok: false, reason: 'daily' };
  if (limits.monthly != null && usage.monthUsed + n > limits.monthly) return { ok: false, reason: 'monthly' };
  return { ok: true };
}

export function consumeCredits(usage: CreditsUsage, amount: number): CreditsUsage {
  const n = clampNonNegInt(amount);
  return {
    ...usage,
    dayUsed: usage.dayUsed + n,
    monthUsed: usage.monthUsed + n,
  };
}

