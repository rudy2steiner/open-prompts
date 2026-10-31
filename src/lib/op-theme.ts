/** Must match `layout.tsx` inline theme script hex values */
export const OP_THEME_BG = {
  dark: '#0e0d0b',
  light: '#ffffff',
} as const;

const OP_THEME_COOKIE = 'op_theme';
const OP_THEME_COOKIE_MAX_AGE = 31536000;

function writeOpThemeCookie(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${OP_THEME_COOKIE}=${encodeURIComponent(theme)};path=/;max-age=${OP_THEME_COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function applyOpThemeToDocument(theme: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const bg = theme === 'dark' ? OP_THEME_BG.dark : OP_THEME_BG.light;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.backgroundColor = bg;
  if (document.body) document.body.style.backgroundColor = bg;
  writeOpThemeCookie(theme);
}

/**
 * Theme as applied on `<html>` (blocking head script + `applyOpThemeToDocument`).
 * Only `data-theme="light"` is light; missing attribute matches `:root` default (dark).
 */
export function getOpDocumentTheme(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/** Prefer localStorage; on failure keep the current `data-theme` from the blocking head script. */
export function readOpThemeFromStorage(): 'dark' | 'light' {
  try {
    const t = localStorage.getItem('op_theme') || 'light';
    return t === 'dark' ? 'dark' : 'light';
  } catch {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }
}
