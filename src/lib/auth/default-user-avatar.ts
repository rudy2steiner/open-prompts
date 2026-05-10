/** Public path (neutral tones; readable on light/dark header backgrounds). */
export const DEFAULT_USER_AVATAR_PATH = '/default-user-avatar.svg';

export function resolveUserAvatarUrl(image: string | null | undefined): string {
  const s = image?.trim();
  if (s) return s;
  return DEFAULT_USER_AVATAR_PATH;
}
