/**
 * API routes live under `app/[locale]/api/*`. With next-intl `localePrefix: 'as-needed'`,
 * `/en/api/...` is redirected to `/api/...` (404). Default locale must call unprefixed `/api/...`
 * (rewritten to `/en/api/...` in next.config).
 */
export function localeApiPath(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'en') return normalized;
  return `/${locale}${normalized}`;
}
