'use client';

import Image from 'next/image';
import { useState } from 'react';

type Props = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  errorText?: string;
  onMeta?: (meta: { width: number; height: number }) => void;
};

export function CoverImage({ src, alt, sizes, priority, className, errorText, onMeta }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const isRemote = /^https?:\/\//i.test(src);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      {!loaded && !errored ? (
        <div className="absolute inset-0 animate-pulse bg-[var(--surface2)]" />
      ) : null}

      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface2)]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1 text-xs font-semibold text-[var(--text2)]">
            {errorText || 'Image failed to load'}
          </div>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={isRemote}
          className={className}
          onLoad={(e) => {
            setLoaded(true);
            const img = e.currentTarget;
            const width = img?.naturalWidth ?? 0;
            const height = img?.naturalHeight ?? 0;
            if (width > 0 && height > 0) onMeta?.({ width, height });
          }}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}

