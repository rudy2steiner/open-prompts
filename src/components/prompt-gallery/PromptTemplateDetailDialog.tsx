'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';

export type PromptDetailItem = {
  /** Slug or gallery id used for `?template=` on the create page. */
  id: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  tags: string[];
  images: string[];
  sourceUrl?: string | null;
  authorHandle?: string | null;
};

const TAG_META_CHIP =
  'rounded-md border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-xs text-[var(--text2)]';

function imgKey(itemId: string, src: string) {
  return `${itemId}::${src}`;
}

export type PromptTemplateDetailDialogProps = {
  open: boolean;
  item: PromptDetailItem | null;
  locale: string;
  onClose: () => void;
  /** Extra row under tags (status, owner, admin actions, etc.). */
  footerExtra?: ReactNode;
  /** Hide generate CTA (e.g. rejected templates). */
  showGenerate?: boolean;
};

export function PromptTemplateDetailDialog({
  open,
  item,
  locale,
  onClose,
  footerExtra,
  showGenerate = true,
}: PromptTemplateDetailDialogProps) {
  const t = useTranslations('OpenPrompts');
  const router = useRouter();
  const [promptCopied, setPromptCopied] = useState(false);
  const [ratioByImageKey, setRatioByImageKey] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!promptCopied) return;
    const timer = window.setTimeout(() => setPromptCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [promptCopied]);

  if (!open || !item) return null;

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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="op-template-detail-title"
    >
      <div
        className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-stone-200 bg-stone-50">
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-lg bg-white/90 px-3 py-1 text-sm font-semibold text-stone-800"
            onClick={onClose}
          >
            ✕
          </button>
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
          <div id="op-template-detail-title" className="text-lg font-semibold text-stone-900">
            {item.title}
          </div>
          {item.description ? (
            <div className="mt-1 text-sm text-stone-600">{item.description}</div>
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
              {item.authorHandle ? `${t('modal.from')} ${item.authorHandle}` : null}
              {item.sourceUrl ? (
                <>
                  {item.authorHandle ? ' · ' : null}
                  <a
                    className="text-[var(--text2)] underline decoration-[var(--border2)] underline-offset-2 hover:text-[var(--text)]"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('modal.viewSource')} ↗
                  </a>
                </>
              ) : null}
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
    </div>
  );
}

export function templateRecordToDetailItem(row: {
  slug: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  tags: string[];
  images: string[];
  sourceUrl?: string | null;
  authorHandle?: string | null;
}): PromptDetailItem {
  return {
    id: row.slug,
    title: row.title,
    description: row.description ?? '',
    prompt: row.prompt ?? '',
    model: row.model,
    tags: row.tags ?? [],
    images: row.images ?? [],
    sourceUrl: row.sourceUrl ?? null,
    authorHandle: row.authorHandle ?? null,
  };
}
