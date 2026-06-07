'use client';

import { useEffect, useState } from 'react';
import {
  avatarGradient,
  avatarInitial,
  hasCustomProfileImage,
  resolveUserAvatarUrl,
} from '~/lib/auth/default-user-avatar';

type Props = {
  image?: string | null;
  seed?: string | null;
  name?: string | null;
  size?: number;
  /** Classes for the outer circular frame (size, ring, etc.). */
  className?: string;
  alt?: string;
};

export function UserAvatar({ image, seed, name, size = 32, className = '', alt = '' }: Props) {
  const photo = resolveUserAvatarUrl(image, seed);
  const [src, setSrc] = useState<string | null>(photo);
  const showInitials = !src;

  useEffect(() => {
    setSrc(resolveUserAvatarUrl(image, seed));
  }, [image, seed]);

  const initial = avatarInitial(name, seed);
  const fontSize = Math.max(11, Math.round(size * 0.42));

  if (showInitials) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ${className}`}
        style={{
          width: size,
          height: size,
          background: avatarGradient(seed),
          fontSize,
          lineHeight: 1,
        }}
        aria-hidden={!alt}
        title={alt || undefined}
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full bg-[var(--surface2)] ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setSrc(null)}
      />
    </span>
  );
}

/** @deprecated exported for callers that still check image type */
export { hasCustomProfileImage };
