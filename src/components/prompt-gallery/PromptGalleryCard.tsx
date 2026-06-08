import { LuMaximize2 } from 'react-icons/lu';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { formatGalleryCardDate } from '~/lib/prompts/gallery-attribution';

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
  /** When set, the card shell renders as a link to the prompt detail page. */
  cardHref?: string;
  onCardClick?: () => void;
  onImageClick?: () => void;
  /** Opens fullscreen/lightbox for the cover only (e.g. create page); avoids nesting buttons inside the cover hit target. */
  onCoverFullscreen?: () => void;
  coverFullscreenTitle?: string;
  onCtaClick?: () => void;
  coverErrorText?: string;
  /** `columns` = CSS column masonry; `masonry` = JS shortest-column; `flow` = flex wrap. */
  layout?: 'columns' | 'masonry' | 'flow';
  coverFit?: 'contain' | 'cover';
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
  cardHref,
  onCardClick,
  onImageClick,
  onCoverFullscreen,
  coverFullscreenTitle,
  onCtaClick,
  coverErrorText,
  layout = 'columns',
  coverFit = 'contain',
}: Props) {
  const showCta = Boolean(onCtaClick && primaryCtaLabel && primaryCtaLabel.trim().length > 0);
  const dateLabel = formatGalleryCardDate(item.createdAt);
  const showFooterLeft = showAuthor && Boolean(authorLabel || dateLabel);
  const imageCount = item.images.filter((src) => src.trim()).length;
  const showImageCount = imageCount > 1;
  const shellClass =
    layout === 'flow' || layout === 'masonry'
      ? 'group relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--border2)] hover:shadow-md'
      : 'group relative z-0 mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition hover:z-10 hover:border-[var(--border2)]';

  return (
    <div
      role={!cardHref && onCardClick ? 'button' : undefined}
      tabIndex={!cardHref && onCardClick ? 0 : undefined}
      onClick={!cardHref ? onCardClick : undefined}
      onKeyDown={
        !cardHref && onCardClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onCardClick?.();
            }
          : undefined
      }
      className={shellClass}
    >
      {cardHref ? (
        <a href={cardHref} className="absolute inset-0 z-[1]" aria-label={item.title}>
          <span className="sr-only">{item.title}</span>
        </a>
      ) : null}
      <div className="relative block w-full bg-[var(--surface2)]" style={{ aspectRatio: coverAspectRatio }}>
        {coverSrc ? (
          <CoverImage
            src={coverSrc}
            alt={item.title}
            sizes={coverSizes}
            className={coverFit === 'cover' ? 'object-cover' : 'object-contain'}
            errorText={coverErrorText}
            onMeta={onMeta}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-[var(--text3)]">—</div>
        )}
        {showImageCount ? (
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-[2] flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium leading-none text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="6" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
              <path
                d="M6.5 14.5l2.5-2.5 2 2 3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="8"
                y="3"
                width="13"
                height="13"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.75"
                opacity="0.55"
              />
            </svg>
            <span>{imageCount}</span>
          </div>
        ) : null}
        {showModelBadge && modelBadge ? (
          <div
            className={`pointer-events-none absolute rounded-md bg-black/55 px-2 py-1 text-[10px] text-white ${
              showImageCount ? 'bottom-3 left-3' : 'left-3 top-3'
            }`}
          >
            {modelBadge}
          </div>
        ) : null}
        {onImageClick ? (
          <button
            type="button"
            className="absolute inset-0 z-[1] cursor-pointer bg-transparent"
            aria-label={item.title}
            onClick={(e) => {
              e.stopPropagation();
              onImageClick();
            }}
          />
        ) : null}
        {onCoverFullscreen && coverSrc ? (
          <button
            type="button"
            className="absolute right-2 top-2 z-[2] grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white/90 opacity-90 shadow-sm transition hover:bg-black/70 md:opacity-0 md:group-hover:opacity-100"
            title={coverFullscreenTitle}
            aria-label={coverFullscreenTitle}
            onClick={(e) => {
              e.stopPropagation();
              onCoverFullscreen();
            }}
          >
            <LuMaximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="min-w-0 overflow-hidden p-4">
        <div
          className="min-w-0 max-w-full truncate text-sm font-semibold text-[var(--text)]"
          title={item.title}
        >
          {item.title}
        </div>
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
              <span className="text-[11px] text-[var(--text3)]">
                {authorLabel ? (
                  authorUrl ? (
                    <a
                      href={authorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="relative z-[2] hover:text-[var(--text2)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                      title={authorLabel}
                    >
                      {authorLabel}
                    </a>
                  ) : (
                    <span>{authorLabel}</span>
                  )
                ) : null}
                {authorLabel && dateLabel ? <span> · </span> : null}
                {dateLabel ? <span>{dateLabel}</span> : null}
              </span>
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
                className="relative z-[2] rounded-md bg-[var(--amber)] px-2.5 py-1 text-[11px] font-semibold text-[var(--bg)]"
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

