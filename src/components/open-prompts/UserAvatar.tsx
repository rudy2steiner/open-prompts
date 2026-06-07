'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_USER_AVATAR_PATH,
  defaultUserAvatarUrl,
  resolveUserAvatarUrl,
} from '~/lib/auth/default-user-avatar';

type Props = {
  image?: string | null;
  seed?: string | null;
  size?: number;
  className?: string;
  alt?: string;
};

export function UserAvatar({ image, seed, size = 32, className = '', alt = '' }: Props) {
  const resolved = resolveUserAvatarUrl(image, seed);
  const generated = defaultUserAvatarUrl(seed);
  const [src, setSrc] = useState(resolved);

  useEffect(() => {
    setSrc(resolved);
  }, [resolved]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== generated) {
          setSrc(generated);
          return;
        }
        if (src !== DEFAULT_USER_AVATAR_PATH) {
          setSrc(DEFAULT_USER_AVATAR_PATH);
        }
      }}
    />
  );
}
