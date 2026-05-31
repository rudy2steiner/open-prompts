import { parseXStatusUrl } from '~/lib/x-import/parse-x-status-url';

/** Normalize a Twitter/X screen name to `@handle` form. */
export function formatXAuthorHandle(screenName: string | null | undefined): string | null {
  const name = screenName?.trim().replace(/^@+/, '');
  if (!name || name === '_' || !/^[A-Za-z0-9_]{1,30}$/i.test(name)) return null;
  return `@${name}`;
}

/** Extract `@author` from a tweet URL path (`x.com/user/status/…`). */
export function authorHandleFromXUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  const parsed = parseXStatusUrl(raw);
  if (parsed && parsed.screenName !== '_') {
    return formatXAuthorHandle(parsed.screenName);
  }

  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host !== 'x.com' && host !== 'twitter.com') return null;
    const match = u.pathname.match(/^\/([A-Za-z0-9_]{1,30})\/status(?:es)?\//i);
    if (match?.[1] && match[1].toLowerCase() !== 'i') {
      return formatXAuthorHandle(match[1]);
    }
  } catch {
    /* invalid url */
  }

  return null;
}

/** Prefer API screen name; fall back to parsing the tweet URL. */
export function resolveXAuthorHandle(opts: {
  sourceUrl?: string | null;
  screenName?: string | null;
}): string {
  const fromApi = formatXAuthorHandle(opts.screenName);
  if (fromApi) return fromApi;
  return authorHandleFromXUrl(opts.sourceUrl) ?? '';
}
