'use client';

import { CoverImage } from '~/components/prompt-gallery/CoverImage';

type Props = {
  src: string;
  alt: string;
  aspectRatio: string;
  fitToCanvas?: boolean;
  indexLabel?: string;
  openTitle: string;
  downloadTitle: string;
  onOpen: () => void;
  onDownload: () => void;
  onMeta: (size: { width: number; height: number }) => void;
};

export function GenerationImageTile({
  src,
  alt,
  aspectRatio,
  fitToCanvas = false,
  indexLabel,
  openTitle,
  downloadTitle,
  onOpen,
  onDownload,
  onMeta,
}: Props) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface2)] ${fitToCanvas ? 'h-full min-h-0' : ''}`}>
      <button
        type="button"
        onClick={onOpen}
        className={`block w-full text-left ${fitToCanvas ? 'h-full' : ''}`}
        title={openTitle}
        style={fitToCanvas ? undefined : { aspectRatio }}
      >
        <CoverImage
          src={src}
          alt={alt}
          sizes="(max-width: 1024px) 100vw, 720px"
          className="object-contain"
          errorText="—"
          onMeta={onMeta}
        />
        <span className="pointer-events-none absolute inset-0 bg-black/0 transition hover:bg-black/10" />
      </button>
      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          onClick={onDownload}
          title={downloadTitle}
          aria-label={downloadTitle}
          className="grid h-8 w-8 place-items-center rounded-lg bg-black/60 text-white hover:bg-black/75"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v10m0 0l4-4m-4 4l-4-4M4 17v3h16v-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onOpen}
          title={openTitle}
          aria-label={openTitle}
          className="grid h-8 w-8 place-items-center rounded-lg bg-black/60 text-white hover:bg-black/75"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M9 3H3v6m18 0V3h-6M3 15v6h6m12-6v6h-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {indexLabel ? (
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
          {indexLabel}
        </div>
      ) : null}
    </div>
  );
}
