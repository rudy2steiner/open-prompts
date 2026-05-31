import { locales } from '~/config';

export type OpLocale = (typeof locales)[number];

const OP_LOCALE_STORAGE = 'op_locale';
/** Same cookie name as next-intl middleware (`localeCookie` default). */
export const OP_LOCALE_COOKIE = 'NEXT_LOCALE';
const OP_LOCALE_COOKIE_MAX_AGE = 31536000;

export function parseOpLocale(raw: string | null | undefined): OpLocale | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v === 'en' || v === 'zh' || v === 'ja') return v;
  if (v === 'zh-cn' || v === 'zh-hans') return 'zh';
  if (v === 'ja-jp') return 'ja';
  return null;
}

function writeOpLocaleCookie(locale: OpLocale) {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${OP_LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${OP_LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    // ignore
  }
}

/** Persist explicit language choice (localStorage + next-intl cookie). */
export function persistOpLocale(locale: OpLocale) {
  writeOpLocaleCookie(locale);
  try {
    localStorage.setItem(OP_LOCALE_STORAGE, locale);
  } catch {
    // ignore
  }
}

export function readOpLocaleFromStorage(): OpLocale | null {
  try {
    return parseOpLocale(localStorage.getItem(OP_LOCALE_STORAGE));
  } catch {
    return null;
  }
}

/**
 * Build href for locale switcher with `localePrefix: 'as-needed'` (English has no `/en` prefix).
 * @param pathSuffix e.g. `''`, `'/create'`, `'/login'`
 */
export function buildLocaleHref(locale: OpLocale | string, pathSuffix = ''): string {
  const suffix = pathSuffix.startsWith('/') ? pathSuffix : pathSuffix ? `/${pathSuffix}` : '';
  const l = parseOpLocale(locale) ?? 'en';
  if (l === 'en') return suffix || '/';
  return `/${l}${suffix}`;
}
