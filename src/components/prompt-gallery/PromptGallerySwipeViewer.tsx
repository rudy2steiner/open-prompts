'use client';

import './prompt-gallery-viewer.css';
import { useEffect, useRef, useState } from 'react';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';

function clampIdx(idx: number, len: number) {
  if (len <= 0) return 0;
  return Math.max(0, Math.min(idx, len - 1));
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  overlayClassName = 'bg-black/75',
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
    child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [open, viewerIndex]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

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

  const goPrev = () => {
    viewerProgrammaticScrollRef.current = true;
    setViewerIndex((v) => Math.max(0, v - 1));
  };

  const goNext = () => {
    viewerProgrammaticScrollRef.current = true;
    setViewerIndex((v) => Math.min(images.length - 1, v + 1));
  };

  if (showDownloadButton) {
    return (
      <div
        className={`op-viewer-overlay fixed inset-0 z-50 ${overlayClassName}`}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div className="flex h-full w-full flex-col" onClick={(e) => e.stopPropagation()}>
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

          {images.length > 1 ? (
            <>
              <button
                type="button"
                className="op-viewer-nav absolute left-4 top-1/2 z-20 -translate-y-1/2"
                onClick={goPrev}
                aria-label={prevLabel ?? 'Previous image'}
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                className="op-viewer-nav absolute right-4 top-1/2 z-20 -translate-y-1/2"
                onClick={goNext}
                aria-label={nextLabel ?? 'Next image'}
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          ) : null}

          <div
            ref={viewerStripRef}
            className="op-viewer-strip flex w-full flex-1 snap-x snap-mandatory items-center overflow-x-auto scroll-smooth"
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
                <div key={`${key}-${idx}`} className="op-viewer-slide">
                  <div className="op-viewer-frame">
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
                  </div>
                </div>
              );
            })}
          </div>

          {images.length > 1 ? (
            <div className="pb-5 pt-2">
              <div
                ref={viewerThumbRef}
                className="op-viewer-thumbs mx-auto flex max-w-3xl items-center justify-center gap-2.5 overflow-x-auto px-6"
              >
                {images.map((src, idx) => {
                  const key = imgKey(src);
                  const ar = ratioByImageKey[key] ?? '16 / 9';
                  const activeThumb = idx === viewerIndex;
                  return (
                    <button
                      key={`${key}-thumb-${idx}`}
                      type="button"
                      className={`op-viewer-thumb ${activeThumb ? 'active' : ''}`}
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
                        className="object-cover"
                        errorText={coverLoadFailedText}
                        onMeta={({ width, height }) => {
                          const nextAr = `${width} / ${height}`;
                          setRatioByImageKey((prev) =>
                            prev[key] === nextAr ? prev : { ...prev, [key]: nextAr },
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

  return (
    <div
      className={`op-viewer-overlay fixed inset-0 z-50 ${overlayClassName} backdrop-blur-[2px]`}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {images.length > 1 ? (
        <div className="op-viewer-counter pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2">
          {viewerIndex + 1} / {images.length}
        </div>
      ) : null}

      <button
        type="button"
        className="op-viewer-close absolute right-5 top-5 z-30"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label={closeLabel ?? 'Close'}
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

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="op-viewer-nav absolute left-5 top-1/2 z-30 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label={prevLabel ?? 'Previous image'}
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            className="op-viewer-nav absolute right-5 top-1/2 z-30 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label={nextLabel ?? 'Next image'}
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      ) : null}

      <div className="flex h-full w-full flex-col" onClick={(e) => e.stopPropagation()}>
        <div
          ref={viewerStripRef}
          className="op-viewer-strip flex w-full flex-1 snap-x snap-mandatory items-center overflow-x-auto scroll-smooth"
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
              <div key={`${key}-${idx}`} className="op-viewer-slide">
                <div className="op-viewer-frame">
                  <CoverImage
                    src={src}
                    alt={title ? `${title} view ${idx + 1}` : `View ${idx + 1}`}
                    sizes="(max-width: 1024px) 100vw, 980px"
                    className="object-contain"
                    priority={idx === viewerIndex}
                    errorText={coverLoadFailedText}
                    onMeta={({ width, height }) => {
                      const nextAr = `${width} / ${height}`;
                      setRatioByImageKey((prev) => (prev[key] === nextAr ? prev : { ...prev, [key]: nextAr }));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {images.length > 1 ? (
          <div className="shrink-0 pb-6 pt-2">
            <div
              ref={viewerThumbRef}
              className="op-viewer-thumbs mx-auto flex max-w-4xl items-center justify-center gap-2.5 overflow-x-auto px-6"
            >
              {images.map((src, idx) => {
                const key = imgKey(src);
                const ar = ratioByImageKey[key] ?? '16 / 9';
                const activeThumb = idx === viewerIndex;
                return (
                  <button
                    key={`${key}-thumb-${idx}`}
                    type="button"
                    className={`op-viewer-thumb ${activeThumb ? 'active' : ''}`}
                    style={{ aspectRatio: ar }}
                    onClick={() => {
                      viewerProgrammaticScrollRef.current = true;
                      setViewerIndex(idx);
                    }}
                  >
                    <CoverImage
                      src={src}
                      alt={title ? `${title} thumb ${idx + 1}` : `Thumb ${idx + 1}`}
                      sizes="72px"
                      className="object-cover"
                      errorText={coverLoadFailedText}
                      onMeta={({ width, height }) => {
                        const nextAr = `${width} / ${height}`;
                        setRatioByImageKey((prev) =>
                          prev[key] === nextAr ? prev : { ...prev, [key]: nextAr },
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
