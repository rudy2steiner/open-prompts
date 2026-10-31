'use client';

import { useEffect, useState } from 'react';

export type SubmitPreviewImageStripProps = {
  images: string[];
  titleLabel: string;
  coverLoadFailedText: string;
  emptyLabel: string;
};

/** Browser loads URLs directly (same-origin proxy not required for preview). */
export function SubmitPreviewImageStrip({
  images,
  titleLabel,
  coverLoadFailedText,
  emptyLabel,
}: SubmitPreviewImageStripProps) {
  const [ratioByIdx, setRatioByIdx] = useState<Record<number, string>>({});
  const [loadedByIdx, setLoadedByIdx] = useState<Record<number, boolean>>({});
  const [failedByIdx, setFailedByIdx] = useState<Record<number, boolean>>({});

  const imagesKey = images.join('\0');
  useEffect(() => {
    setRatioByIdx({});
    setLoadedByIdx({});
    setFailedByIdx({});
  }, [imagesKey]);

  if (images.length === 0) {
    return (
      <div className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 text-[var(--text3)]">
        <span className="text-2xl opacity-60">▢</span>
        <span className="text-[11px]">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {images.map((u, idx) => (
        <div key={idx} className="w-full">
          <div
            className="group relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-left"
            style={{ aspectRatio: ratioByIdx[idx] ?? '4 / 3' }}
          >
            {!loadedByIdx[idx] && !failedByIdx[idx] ? (
              <div className="absolute inset-0 animate-pulse bg-[var(--surface2)]" />
            ) : null}
            {failedByIdx[idx] ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface2)]">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-1 text-xs font-semibold text-[var(--text2)]">
                  {coverLoadFailedText}
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u}
                alt={`${titleLabel} ${idx + 1}`}
                className="absolute inset-0 h-full w-full object-contain"
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const w = img.naturalWidth;
                  const h = img.naturalHeight;
                  if (w > 0 && h > 0) {
                    const ar = `${w} / ${h}`;
                    setRatioByIdx((prev) => (prev[idx] === ar ? prev : { ...prev, [idx]: ar }));
                  }
                  setLoadedByIdx((prev) => ({ ...prev, [idx]: true }));
                }}
                onError={() => {
                  setFailedByIdx((prev) => ({ ...prev, [idx]: true }));
                  setLoadedByIdx((prev) => ({ ...prev, [idx]: true }));
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
          </div>
          <div className="mt-1 text-[10px] text-[var(--text3)]">
            {idx + 1}/{images.length}
          </div>
        </div>
      ))}
    </div>
  );
}
