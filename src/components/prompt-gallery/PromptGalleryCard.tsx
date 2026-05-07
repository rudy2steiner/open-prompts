import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import type { PromptGalleryItem } from '~/data/promptGallery';

type Props = {
  item: PromptGalleryItem;
  coverSrc: string | undefined;
  coverSizes: string;
  coverAspectRatio: string;
  modelBadge?: string;
  description?: string;
  tags?: string[];
  aspectTag?: string | null;
  authorLabel?: string | null;
  authorUrl?: string | null;
  primaryCtaLabel?: string;
  showModelBadge?: boolean;
  showDescription?: boolean;
  showTags?: boolean;
  showAuthor?: boolean;
  onMeta?: (meta: { width: number; height: number }) => void;
  onCardClick?: () => void;
  onImageClick?: () => void;
  onCtaClick?: () => void;
  coverErrorText?: string;
};

export function PromptGalleryCard({
  item,
  coverSrc,
  coverSizes,
  coverAspectRatio,
  modelBadge,
  description,
  tags,
  aspectTag,
  authorLabel,
  authorUrl,
  primaryCtaLabel,
  showModelBadge = true,
  showDescription = true,
  showTags = true,
  showAuthor = true,
  onMeta,
  onCardClick,
  onImageClick,
  onCtaClick,
  coverErrorText,
}: Props) {
  const showCta = Boolean(onCtaClick && primaryCtaLabel && primaryCtaLabel.trim().length > 0);
  const showFooterLeft = showAuthor && Boolean(authorLabel);

  return (
    <div
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onCardClick?.();
            }
          : undefined
      }
      className="group relative z-0 mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition hover:z-10 hover:border-[var(--border2)]"
    >
      <button
        type="button"
        className="relative block w-full bg-black/20"
        style={{ aspectRatio: coverAspectRatio }}
        onClick={(e) => {
          if (!onImageClick) return;
          e.stopPropagation();
          onImageClick();
        }}
      >
        {coverSrc ? (
          <CoverImage
            src={coverSrc}
            alt={item.title}
            sizes={coverSizes}
            className="object-contain"
            errorText={coverErrorText}
            onMeta={onMeta}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-[var(--text3)]">—</div>
        )}
        {showModelBadge && modelBadge ? (
          <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white">
            {modelBadge}
          </div>
        ) : null}
      </button>

      <div className="p-4">
        <div className="truncate text-sm font-semibold text-[var(--text)]">{item.title}</div>
        {showDescription && description ? (
          <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text3)]">{description}</div>
        ) : null}

        {showTags && (aspectTag || (tags && tags.length)) ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {aspectTag ? (
              <span className="rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[10px] text-[var(--text2)]">
                {aspectTag}
              </span>
            ) : null}
            {(tags || []).slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-md border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[10px] text-[var(--text2)]"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {showFooterLeft || showCta ? (
          <div className="mt-4 flex items-center justify-between">
            {showFooterLeft ? (
              authorUrl ? (
                <a
                  href={authorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[var(--text3)] hover:text-[var(--text2)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  title={authorLabel ?? undefined}
                >
                  {authorLabel}
                </a>
              ) : (
                <span className="text-[11px] text-[var(--text3)]">{authorLabel}</span>
              )
            ) : (
              <span />
            )}

            {showCta ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCtaClick?.();
                }}
                className="rounded-md bg-[var(--amber)] px-2.5 py-1 text-[11px] font-semibold text-[var(--bg)]"
              >
                {primaryCtaLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

