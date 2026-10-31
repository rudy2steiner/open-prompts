export type AdminDailyTrendPoint = {
  date: string;
  newUsers: number;
  newPrompts: number;
};

/** Single-series daily count for line charts. */
export type DailyCountPoint = {
  date: string;
  count: number;
};

export const ADMIN_USER_TREND_DAYS_MAX = 90;
export const ADMIN_USER_TREND_RANGES = [7, 30, 90] as const;
export type AdminUserTrendRange = (typeof ADMIN_USER_TREND_RANGES)[number];

/** Allowed trend windows: 7d (1 week), 30d (1 month), 90d (3 months max). Default 30. */
export function normalizeTrendDays(raw?: number | string | null): AdminUserTrendRange {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}
