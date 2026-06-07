/**
 * Default avatars for users without OAuth/profile photos.
 * Served via same-origin `/api/avatar` (PNG, reliable in <img> tags).
 * @see https://www.dicebear.com/styles/lorelei-neutral
 */

/** Modern line-art portraits — clean at 32px, works for any user. */
export const DEFAULT_AVATAR_STYLE = 'lorelei-neutral';

export const DICEBEAR_VERSION = '10.x';

export const AVATAR_RENDER_SIZE = 128;

/** Warm neutrals aligned with Open Prompts (--bg, --amber). */
export const AVATAR_BACKGROUNDS = 'f5f0e8,e8dfd0,ffd5bf,f0e6d8,d6e4ff,edd9c8';

/** Fallback when no seed (offline / tests). */
export const DEFAULT_USER_AVATAR_PATH = '/default-user-avatar.svg';

function avatarSeed(seed: string | null | undefined): string {
  const s = seed?.trim();
  if (s) return s;
  return 'guest';
}

/** Same-origin avatar URL (same seed → same face). */
export function defaultUserAvatarUrl(seed: string | null | undefined): string {
  const params = new URLSearchParams({ seed: avatarSeed(seed) });
  return `/api/avatar?${params.toString()}`;
}

function isGeneratedAvatarUrl(url: string): boolean {
  if (url === DEFAULT_USER_AVATAR_PATH) return true;
  if (url.startsWith('/default-')) return true;
  if (url.includes('api.dicebear.com')) return true;
  if (url.startsWith('/api/avatar')) return true;
  return false;
}

export function resolveUserAvatarUrl(
  image: string | null | undefined,
  seed?: string | null,
): string {
  const s = image?.trim();
  if (s && !isGeneratedAvatarUrl(s)) return s;
  return defaultUserAvatarUrl(seed);
}
