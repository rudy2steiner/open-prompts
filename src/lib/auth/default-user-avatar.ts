/**
 * Default avatars for users without OAuth/profile photos.
 * Rendered as brand initials (warm gradient) in `UserAvatar`.
 */

/** @deprecated Initials avatars are rendered in-app; kept for legacy URL detection. */
export const DEFAULT_USER_AVATAR_PATH = '/default-user-avatar.svg';

function avatarSeed(seed: string | null | undefined): string {
  const s = seed?.trim();
  if (s) return s;
  return 'guest';
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const AVATAR_GRADIENTS: readonly (readonly [string, string])[] = [
  ['#c96a1a', '#f0b429'],
  ['#b45309', '#fbbf24'],
  ['#a16207', '#fcd34d'],
  ['#d97706', '#fdba74'],
  ['#ea580c', '#f59e0b'],
  ['#c2410c', '#f97316'],
];

function isGeneratedAvatarUrl(url: string): boolean {
  if (url === DEFAULT_USER_AVATAR_PATH) return true;
  if (url.startsWith('/default-')) return true;
  if (url.includes('api.dicebear.com')) return true;
  if (url.startsWith('/api/avatar')) return true;
  return false;
}

export function hasCustomProfileImage(image: string | null | undefined): boolean {
  const s = image?.trim();
  if (!s) return false;
  return !isGeneratedAvatarUrl(s);
}

/** First letter for initials avatar. */
export function avatarInitial(name?: string | null, seed?: string | null): string {
  const fromName = name?.trim();
  if (fromName) {
    const ch = fromName.charAt(0);
    if (/[a-zA-Z0-9]/.test(ch)) return ch.toUpperCase();
  }
  const email = seed?.trim();
  if (email?.includes('@')) {
    const local = email.split('@')[0]?.trim();
    if (local) return local.charAt(0).toUpperCase();
  }
  if (email) return email.charAt(0).toUpperCase();
  return '?';
}

/** Deterministic warm gradient aligned with site amber palette. */
export function avatarGradient(seed?: string | null): string {
  const idx = hashSeed(avatarSeed(seed)) % AVATAR_GRADIENTS.length;
  const [from, to] = AVATAR_GRADIENTS[idx]!;
  return `linear-gradient(145deg, ${from} 0%, ${to} 100%)`;
}

/** @deprecated Use `hasCustomProfileImage` + initials in `UserAvatar`. */
export function defaultUserAvatarUrl(seed: string | null | undefined): string {
  const params = new URLSearchParams({ seed: avatarSeed(seed) });
  return `/api/avatar?${params.toString()}`;
}

/** Returns OAuth/profile photo URL, or null when initials should be shown. */
export function resolveUserAvatarUrl(
  image: string | null | undefined,
  _seed?: string | null,
): string | null {
  const s = image?.trim();
  if (s && hasCustomProfileImage(s)) return s;
  return null;
}
