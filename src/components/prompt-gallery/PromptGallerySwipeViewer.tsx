'use client';

import { useEffect, useRef, useState } from 'react';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';

function clampIdx(idx: number, len: number) {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(idx, len - 1));
}

export type PromptGallerySwipeViewerProps = {
  open: boolean;
  onClose: () => void;
  images: string[];
  /** Used in image alt text */
  title: string;
  /** Stable prefix for aspect-ratio cache keys */
  imageKeyPrefix: string;
  initialIndex?: number;
  coverLoadFailedText: string;
  /** Create-page style header with download (gallery uses minimal chrome). */
  showDownloadButton?: boolean;
  downloadTitle?: string;
  closeLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  overlayClassName?: string;
};

export function PromptGallerySwipeViewer({
  open,
  onClose,
  images,
  title,
  imageKeyPrefix,
  initialIndex = 0,
  coverLoadFailedText,
  showDownloadButton = false,
  downloadTitle,
  closeLabel,
  prevLabel,
  nextLabel,
  overlayClassName = 'bg-black/55',
}: PromptGallerySwipeViewerProps) {
  const [viewerIndex, setViewerIndex] = useState(0);
  const [ratioByImageKey, setRatioByImageKey] = useState<Record<string, string>>({});
  const viewerStripRef = useRef<HTMLDivElement | null>(null);
  const viewerThumbRef = useRef<HTMLDivElement | null>(null);
  const viewerProgrammaticScrollRef = useRef(false);

  const imgKey = (src: string) => `${imageKeyPrefix}::${src}`;

  useEffect(() => {
    if (!open) return;
    viewerProgrammaticScrollRef.current = true;
    setViewerIndex(clampIdx(initialIndex, images.length));
  }, [open, initialIndex, images.length]);

  useEffect(() => {
    if (!open) return;
    const el = viewerStripRef.current;
    if (!el) return;
    if (!viewerProgrammaticScrollRef.current) return;
    viewerProgrammaticScrollRef.current = false;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: viewerIndex * w, behavior: 'smooth' });
  }, [open, viewerIndex]);

  useEffect(() => {
    if (!open) return;
    const el = viewerThumbRef.current;
    if (!el) return;
    const child = el.children.item(viewerIndex) as HTMLElement | null;
    if (!child) return;
    child.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
  }, [open, viewerIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        viewerProgrammaticScrollRef.current = true;
        setViewerIndex((v) => Math.max(0, v - 1));
      } else if (e.key === 'ArrowRight') {
        viewerProgrammaticScrollRef.current = true;
        setViewerIndex((v) => Math.min(images.length - 1, v + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 z-50 ${overlayClassName}`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {!showDownloadButton ? (
        <button
          type="button"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-black/50"
          onClick={onClose}
          aria-label={closeLabel ?? 'Close'}
        >
          ✕
        </button>
      ) : null}

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/20 hover:bg-black/50"
            onClick={(e) => {
              e.stopPropagation();
              viewerProgrammaticScrollRef.current = true;
              setViewerIndex((v) => Math.max(0, v - 1));
            }}
            aria-label={prevLabel ?? 'Previous image'}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/20 hover:bg-black/50"
            onClick={(e) => {
              e.stopPropagation();
              viewerProgrammaticScrollRef.current = true;
              setViewerIndex((v) => Math.min(images.length - 1, v + 1));
            }}
            aria-label={nextLabel ?? 'Next image'}
          >
            ›
          </button>
        </>
      ) : null}

      <div
        className="flex h-full w-full flex-col"
        onClick={showDownloadButton ? (e) => e.stopPropagation() : undefined}
      >
        {showDownloadButton ? (
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 text-white">
            <div className="text-xs text-white/70">
              {viewerIndex + 1}/{images.length}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={images[viewerIndex]}
                target="_blank"
                rel="noreferrer"
                download
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15"
                title={downloadTitle}
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3v10m0 0l4-4m-4 4l-4-4M4 17v3h16v-3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/15"
                onClick={onClose}
                title={closeLabel}
                aria-label={closeLabel}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <div
          ref={viewerStripRef}
          className="flex w-full flex-1 snap-x snap-mandatory items-center overflow-x-auto scroll-smooth px-6 pt-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = el.clientWidth || 1;
            const next = Math.round(el.scrollLeft / w);
            viewerProgrammaticScrollRef.current = false;
            if (next !== viewerIndex) setViewerIndex(next);
          }}
        >
          {images.map((src, idx) => {
            const key = imgKey(src);
            const ar = ratioByImageKey[key] ?? '16 / 9';
            return (
              <div key={`${key}-${idx}`} className="flex w-full shrink-0 snap-center items-center justify-center">
                <div
                  className="relative mx-auto h-[56vh] max-h-[520px] w-auto"
                  style={{ aspectRatio: ar }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CoverImage
                    src={src}
                    alt={title ? `${title} view ${idx + 1}` : `View ${idx + 1}`}
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-contain"
                    priority={idx === viewerIndex}
                    errorText={coverLoadFailedText}
                    onMeta={({ width, height }) => {
                      const nextAr = `${width} / ${height}`;
                      setRatioByImageKey((prev) => (prev[key] === nextAr ? prev : { ...prev, [key]: nextAr }));
                    }}
                  />
                  {images.length > 1 ? (
                    <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
                      {idx + 1}/{images.length}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {images.length > 1 ? (
          <div className="-mt-2 pb-4">
            <div
              ref={viewerThumbRef}
              className="mx-auto flex max-w-3xl items-center justify-center gap-2 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((src, idx) => {
                const key = imgKey(src);
                const ar = ratioByImageKey[key] ?? '16 / 9';
                const activeThumb = idx === viewerIndex;
                return (
                  <button
                    key={`${key}-thumb-${idx}`}
                    type="button"
                    className={`relative h-12 w-auto shrink-0 overflow-hidden rounded-none bg-black/25 ring-2 transition ${
                      activeThumb ? 'ring-white/90' : 'ring-white/25 hover:ring-white/45'
                    }`}
                    style={{ aspectRatio: ar }}
                    onClick={() => {
                      viewerProgrammaticScrollRef.current = true;
                      setViewerIndex(idx);
                    }}
                  >
                    <CoverImage
                      src={src}
                      alt={title ? `${title} thumb ${idx + 1}` : `Thumb ${idx + 1}`}
                      sizes="64px"
                      className="object-contain"
                      errorText={coverLoadFailedText}
                      onMeta={({ width, height }) => {
                        const nextAr = `${width} / ${height}`;
                        setRatioByImageKey((prev) =>
                          prev[key] === nextAr ? prev : { ...prev, [key]: nextAr }
                        );
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
