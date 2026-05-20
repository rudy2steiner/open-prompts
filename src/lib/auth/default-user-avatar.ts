/**
 * Default avatars for users without OAuth/profile photos.
 * DiceBear illustrated portraits (stable per email / user id).
 * @see https://www.dicebear.com/styles/personas
 */

/** Soft illustrated portraits — cleaner than adventurer; works at 32px. */
export const DEFAULT_AVATAR_STYLE = 'personas';

const DICEBEAR_VERSION = '9.x';

/** Fallback when no seed (offline / tests). */
export const DEFAULT_USER_AVATAR_PATH = '/default-user-avatar.svg';

function avatarSeed(seed: string | null | undefined): string {
  const s = seed?.trim();
  if (s) return s;
  return 'guest';
}

/** Deterministic illustrated avatar URL (same seed → same face). */
export function defaultUserAvatarUrl(seed: string | null | undefined): string {
  const params = new URLSearchParams({
    seed: avatarSeed(seed),
    backgroundColor: 'f5f0e8,e8dfd0,edd9c8,d6e4ff,f0e6d8',
    radius: '50',
  });
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${DEFAULT_AVATAR_STYLE}/svg?${params.toString()}`;
}

function isCustomProfileImage(url: string): boolean {
  if (url === DEFAULT_USER_AVATAR_PATH) return false;
  if (url.startsWith('/default-')) return false;
  // Regenerate when style changes (session may still store old DiceBear URLs).
  if (url.includes('api.dicebear.com')) return false;
  return true;
}

export function resolveUserAvatarUrl(
  image: string | null | undefined,
  seed?: string | null,
): string {
  const s = image?.trim();
  if (s && isCustomProfileImage(s)) return s;
  return defaultUserAvatarUrl(seed);
}
