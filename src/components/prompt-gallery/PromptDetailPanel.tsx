'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import { galleryAuthorLabel } from '~/lib/prompts/gallery-attribution';
import type { PromptDetailItem } from '~/lib/prompts/prompt-detail-item';

export type { PromptDetailItem };

const TAG_META_CHIP =
  'rounded-md border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-xs text-[var(--text2)]';

function imgKey(itemId: string, src: string) {
  return `${itemId}::${src}`;
}

export type PromptDetailPanelProps = {
  item: PromptDetailItem;
  locale: string;
  /** Renders in the image header (e.g. dialog close button). */
  headerAction?: ReactNode;
  footerExtra?: ReactNode;
  showGenerate?: boolean;
  /** Dialog uses max-height; page flows naturally. */
  variant?: 'dialog' | 'page';
};

export function PromptDetailPanel({
  item,
  locale,
  headerAction,
  footerExtra,
  showGenerate = true,
  variant = 'page',
}: PromptDetailPanelProps) {
  const t = useTranslations('OpenPrompts');
  const router = useRouter();
  const [promptCopied, setPromptCopied] = useState(false);
  const [ratioByImageKey, setRatioByImageKey] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!promptCopied) return;
    const timer = window.setTimeout(() => setPromptCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [promptCopied]);

  const createHref =
    locale === 'en'
      ? `/create?template=${encodeURIComponent(item.id)}`
      : `/${locale}/create?template=${encodeURIComponent(item.id)}`;

  const copyPrompt = async () => {
    const text = item.prompt ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setPromptCopied(true);
      } catch {
        // no-op
      }
    }
  };

  const shellClass =
    variant === 'dialog'
      ? 'flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl'
      : 'flex w-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl';

  return (
    <div className={shellClass}>
      <div className="relative border-b border-stone-200 bg-stone-50">
        {headerAction ? <div className="absolute right-3 top-3 z-10">{headerAction}</div> : null}
        <div className="p-3 sm:p-4">
          <div className="flex w-full snap-x snap-mandatory items-center overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {item.images.length ? (
              item.images.map((src, idx) => {
                const key = imgKey(item.id, src);
                const ar = ratioByImageKey[key] ?? '16 / 9';
                return (
                  <div key={src} className="flex w-full shrink-0 snap-center items-center justify-center px-2">
                    <div
                      className="relative h-[48vh] max-h-[420px] w-auto overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200"
                      style={{ aspectRatio: ar }}
                    >
                      <CoverImage
                        src={src}
                        alt={`${item.title} ${idx + 1}`}
                        sizes="(max-width: 1024px) 100vw, 768px"
                        className="object-contain"
                        priority={idx === 0}
                        errorText={t('gallery.coverLoadFailed')}
                        onMeta={({ width, height }) => {
                          const nextAr = `${width} / ${height}`;
                          setRatioByImageKey((prev) =>
                            prev[key] === nextAr ? prev : { ...prev, [key]: nextAr },
                          );
                        }}
                      />
                      {item.images.length > 1 ? (
                        <div className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white">
                          {idx + 1}/{item.images.length}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-[200px] w-full items-center justify-center text-sm text-stone-400">
                —
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <h1 id="op-template-detail-title" className="text-lg font-semibold text-stone-900">
          {item.title}
        </h1>
        {item.description ? (
          <p className="mt-1 text-sm text-stone-600">{item.description}</p>
        ) : null}

        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold tracking-wide text-stone-500">
              {t('modal.promptLabel')}
            </div>
            <button
              type="button"
              className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
              onClick={() => void copyPrompt()}
              title={t('modal.copy')}
            >
              {promptCopied ? t('modal.copied') : t('modal.copy')}
            </button>
          </div>
          <div className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
            {item.prompt}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.model ? <span className={TAG_META_CHIP}>{item.model}</span> : null}
          {item.tags.map((tag) => (
            <span key={tag} className={TAG_META_CHIP}>
              {tag}
            </span>
          ))}
        </div>

        {footerExtra ? <div className="mt-4 flex flex-wrap items-center gap-2">{footerExtra}</div> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-stone-500">
            {(() => {
              const credit = galleryAuthorLabel(item, '');
              const hasCredit = Boolean(credit);
              const hasSource = Boolean(item.sourceUrl?.trim());
              if (!hasCredit && !hasSource) return null;
              return (
                <>
                  {hasCredit ? `${t('modal.from')} ${credit}` : null}
                  {hasSource ? (
                    <>
                      {hasCredit ? ' · ' : null}
                      <a
                        className="text-[var(--text2)] underline decoration-[var(--border2)] underline-offset-2 hover:text-[var(--text)]"
                        href={item.sourceUrl!}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('modal.viewSource')} ↗
                      </a>
                    </>
                  ) : null}
                </>
              );
            })()}
          </div>
          {showGenerate ? (
            <button
              type="button"
              className="rounded-lg bg-[var(--amber)] px-4 py-2 text-sm font-semibold text-[var(--bg)] hover:bg-[var(--amber2)]"
              onClick={() => router.push(createHref)}
            >
              🚀 {t('modal.generateNow')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
