'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type Props = {
  src: string;
  naturalAspectRatio?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  errorText?: string;
  onMeta?: (meta: { width: number; height: number }) => void;
};

export function CoverImage({ src, alt, sizes, priority, className, errorText, onMeta, naturalAspectRatio }: Props) {
  const [errored, setErrored] = useState(false);
  const isRemote =
    /^https?:\/\//i.test(src) || src.startsWith('data:') || src.includes('/api/image-proxy');

  useEffect(() => {
    setErrored(false);
  }, [src]);

  return (
    <div className={`relative w-full overflow-hidden bg-[var(--surface2)]${naturalAspectRatio ? '' : ' h-full'}`}>
      <Image
        key={src}
        src={src}
        alt={alt}
        {...(naturalAspectRatio ? {width: 1200, height: 750} : {fill: true})}
        style={naturalAspectRatio ? {display: 'block', width: '100%', height: 'auto', aspectRatio: `auto ${naturalAspectRatio}`} : undefined}
        sizes={sizes}
        priority={priority}
        unoptimized={isRemote}
        referrerPolicy="no-referrer"
        className={className}
        onLoad={(e) => {
          const img = e.currentTarget;
          const width = img?.naturalWidth ?? 0;
          const height = img?.naturalHeight ?? 0;
          if (width > 0 && height > 0) onMeta?.({ width, height });
        }}
        onError={() => setErrored(true)}
      />


      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface2)]">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1 text-xs font-semibold text-[var(--text2)]">
            {errorText || 'Image failed to load'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

