export const ACCOUNT_PANEL_SEGMENTS = [
  'prompts',
  'admin',
  'users',
  'credits',
  'subscription',
] as const;

export type AccountPanelSegment = (typeof ACCOUNT_PANEL_SEGMENTS)[number];

export type AccountPanel = 'overview' | AccountPanelSegment;

/** Includes virtual panels that are not URL segments. */
export type ResolvedAccountPanel = AccountPanel | 'admin-denied';

export function accountPanelHref(locale: string, panel: AccountPanel = 'overview'): string {
  const base = locale === 'en' ? '/account' : `/${locale}/account`;
  if (panel === 'overview') return base;
  return `${base}/${panel}`;
}

export function isAccountPanelSegment(raw: string): raw is AccountPanelSegment {
  return (ACCOUNT_PANEL_SEGMENTS as readonly string[]).includes(raw);
}

export function resolveAccountPanel(
  segment: string | undefined,
  isAdmin: boolean,
): ResolvedAccountPanel {
  if (!segment) return 'overview';
  if (!isAccountPanelSegment(segment)) return 'overview';
  if ((segment === 'admin' || segment === 'users') && !isAdmin) return 'admin-denied';
  return segment;
}

/** Map legacy `?panel=` values to path segments. */
export function accountPanelFromLegacyQuery(raw: string | null | undefined): AccountPanel {
  if (!raw || raw === 'overview') return 'overview';
  if (isAccountPanelSegment(raw)) return raw;
  return 'overview';
}
