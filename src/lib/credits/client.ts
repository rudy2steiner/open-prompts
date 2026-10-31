export type CreditsLimits = {
  daily: number | null; // null => unlimited
  monthly: number | null; // null => unlimited
};

export type CreditsUsage = {
  day: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  dayUsed: number;
  monthUsed: number;
};

const STORAGE_KEY = 'op_credits_usage_v1';

function todayParts(now = new Date()) {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { day: `${yyyy}-${mm}-${dd}`, month: `${yyyy}-${mm}` };
}

function clampNonNegInt(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

export function getCreditsLimitsFromEnv(): CreditsLimits {
  // NEXT_PUBLIC_* env vars are exposed to the client in Next.js builds.
  const dailyRaw = (process.env.NEXT_PUBLIC_DAILY_IMAGE_CREDITS || '').trim();
  const monthlyRaw = (process.env.NEXT_PUBLIC_MONTHLY_IMAGE_CREDITS || '').trim();

  const daily = clampNonNegInt(dailyRaw);
  const monthly = clampNonNegInt(monthlyRaw);

  return {
    daily: daily > 0 ? daily : null,
    monthly: monthly > 0 ? monthly : null,
  };
}

export function readCreditsUsage(now = new Date()): CreditsUsage {
  const { day, month } = todayParts(now);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { day, month, dayUsed: 0, monthUsed: 0 };
    const parsed = JSON.parse(raw);
    const prevDay = typeof parsed?.day === 'string' ? parsed.day : '';
    const prevMonth = typeof parsed?.month === 'string' ? parsed.month : '';
    const prevDayUsed = clampNonNegInt(parsed?.dayUsed);
    const prevMonthUsed = clampNonNegInt(parsed?.monthUsed);

    return {
      day,
      month,
      dayUsed: prevDay === day ? prevDayUsed : 0,
      monthUsed: prevMonth === month ? prevMonthUsed : 0,
    };
  } catch {
    return { day, month, dayUsed: 0, monthUsed: 0 };
  }
}

export function writeCreditsUsage(usage: CreditsUsage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
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

export function consumeCredits(amount: number, now = new Date()): CreditsUsage {
  const current = readCreditsUsage(now);
  const n = clampNonNegInt(amount);
  const next: CreditsUsage = {
    ...current,
    dayUsed: current.dayUsed + n,
    monthUsed: current.monthUsed + n,
  };
  writeCreditsUsage(next);
  return next;
}

