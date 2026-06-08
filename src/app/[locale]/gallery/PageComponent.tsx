'use client';

import './gallery-page.css';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { PromptGalleryCard } from '~/components/prompt-gallery/PromptGalleryCard';
import { GalleryFilterStrip } from '~/components/prompt-gallery/GalleryFilterStrip';
import { PromptGalleryMasonry } from '~/components/prompt-gallery/PromptGalleryMasonry';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { galleryAuthorLabel, galleryAuthorUrl } from '~/lib/prompts/gallery-attribution';
import {
  dimensionsToAspectRatio,
  preloadCoverDimensionsByUrl,
  type CoverDimensions,
} from '~/lib/prompts/preload-cover-dimensions';
import { useTranslations } from 'next-intl';

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
  initialModel?: string;
  initialCategory?: SubmitCategoryKey;
};

const PAGE_SIZE = 18;
const DEFAULT_COVER_ASPECT = '1.6';

function coverUrls(items: PromptGalleryItem[]): string[] {
  return items.map((p) => p.images[0]).filter(Boolean);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

import {
  mergeCategoryTags,
  promptMatchesGalleryFilter,
  type SubmitCategoryKey,
} from '~/lib/prompts/prompt-categories';
import { promptHref } from '~/lib/prompts/seo-paths';
import { formatSubTagLabel } from '~/lib/prompts/sub-tag-i18n';

export default function PageComponent({
  locale,
  prompts,
  initialModel,
  initialCategory,
}: Props) {
  const t = useTranslations('OpenPrompts');
  const tSubmit = useTranslations('OpenPrompts.submitPage');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [model, setModel] = useState<string>(() => {
    if (!initialModel) return 'all';
    return prompts.some((p) => p.model === initialModel) ? initialModel : 'all';
  });
  const [categoryId, setCategoryId] = useState<'all' | SubmitCategoryKey>(() =>
    initialCategory ?? 'all',
  );
  const [subTag, setSubTag] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [autoLoading, setAutoLoading] = useState(false);
  const [enteringDelays, setEnteringDelays] = useState<Map<string, number>>(() => new Map());
  const prevVisibleLenRef = useRef(0);
  const prevFilteredLenRef = useRef(0);
  const [ratioByUrl, setRatioByUrl] = useState<Record<string, string>>({});
  const [ratioMetaById, setRatioMetaById] = useState<Record<string, { w: number; h: number }>>({});
  const models = useMemo(
    () => ['all', ...uniq(prompts.map((p) => p.model)).sort((a, b) => a.localeCompare(b))],
    [prompts],
  );
  const subTags = useMemo(() => {
    if (categoryId === 'all') return [];
    return mergeCategoryTags(categoryId, prompts);
  }, [categoryId, prompts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      if (model !== 'all' && p.model !== model) return false;
      if (!promptMatchesGalleryFilter(p, categoryId, subTag)) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [query, model, categoryId, subTag, prompts]);

  const categoryLabel = (id: SubmitCategoryKey) => tSubmit(`categories.${id}`);
  const subTagLabel = useCallback(
    (tag: string) => formatSubTagLabel(tag, (key) => tSubmit(`subTags.${key}`)),
    [tSubmit],
  );

  const sectionLabel = useMemo(() => {
    if (categoryId === 'all') return t('section.latest');
    const catName = categoryLabel(categoryId);
    if (!subTag) return catName;
    return t('section.categorySub', { category: catName, subTag: subTagLabel(subTag) });
  }, [categoryId, subTag, t, tSubmit, subTagLabel]);

  const resetPagination = () => setLimit(PAGE_SIZE);

  const handleModelChange = (next: string) => {
    setModel(next);
    resetPagination();
  };

  const handleCategoryChange = (next: 'all' | SubmitCategoryKey) => {
    setCategoryId(next);
    resetPagination();
    setSubTag(null);
  };

  const handleSubTagChange = (next: string) => {
    setSubTag((prev) => (prev === next ? null : next));
    resetPagination();
  };

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);
  const hasMore = visible.length < filtered.length;

  useEffect(() => {
    const isLoadMore =
      visible.length > prevVisibleLenRef.current &&
      filtered.length === prevFilteredLenRef.current;

    if (isLoadMore) {
      const batch = visible.slice(prevVisibleLenRef.current);
      const delays = new Map<string, number>();
      batch.forEach((item, index) => {
        delays.set(item.id, index * 55);
      });
      setEnteringDelays(delays);
      const timer = window.setTimeout(() => setEnteringDelays(new Map()), 900);
      prevVisibleLenRef.current = visible.length;
      prevFilteredLenRef.current = filtered.length;
      return () => window.clearTimeout(timer);
    }

    if (
      filtered.length !== prevFilteredLenRef.current ||
      visible.length < prevVisibleLenRef.current
    ) {
      setEnteringDelays(new Map());
    }

    prevVisibleLenRef.current = visible.length;
    prevFilteredLenRef.current = filtered.length;
  }, [visible, filtered.length]);

  const getAuthorUrl = (item: PromptGalleryItem): string | undefined => galleryAuthorUrl(item);

  const getAuthorLabel = (item: PromptGalleryItem): string =>
    galleryAuthorLabel(item, t('card.community'));

  const applyDimensions = (items: PromptGalleryItem[], dims: Map<string, CoverDimensions>) => {
    if (dims.size === 0) return;
    const idByUrl = new Map<string, string>();
    for (const p of items) {
      const url = p.images[0]?.trim();
      if (url) idByUrl.set(url, p.id);
    }

    setRatioByUrl((prev) => {
      const ratio = { ...prev };
      let changed = false;
      dims.forEach(({ width, height }, url) => {
        const ar = dimensionsToAspectRatio({ width, height });
        if (ratio[url] !== ar) {
          ratio[url] = ar;
          changed = true;
        }
      });
      return changed ? ratio : prev;
    });

    setRatioMetaById((prev) => {
      const meta = { ...prev };
      let changed = false;
      dims.forEach(({ width, height }, url) => {
        const id = idByUrl.get(url);
        if (!id || (meta[id]?.w === width && meta[id]?.h === height)) return;
        meta[id] = { w: width, h: height };
        changed = true;
      });
      return changed ? meta : prev;
    });
  };

  const coverAspectFor = (item: PromptGalleryItem) => {
    const url = item.images[0]?.trim();
    if (url && ratioByUrl[url]) return ratioByUrl[url];
    return DEFAULT_COVER_ASPECT;
  };

  const rememberCoverMeta = (item: PromptGalleryItem, width: number, height: number) => {
    const url = item.images[0]?.trim();
    const ar = dimensionsToAspectRatio({ width, height });
    if (url) {
      setRatioByUrl((prev) => (prev[url] === ar ? prev : { ...prev, [url]: ar }));
    }
    setRatioMetaById((prev) =>
      prev[item.id]?.w === width && prev[item.id]?.h === height
        ? prev
        : { ...prev, [item.id]: { w: width, h: height } },
    );
  };

  const formatAspectTag = (id: string): string | null => {
    const meta = ratioMetaById[id];
    if (!meta || meta.w <= 0 || meta.h <= 0) return null;
    const r = meta.w / meta.h;

    const COMMON: Array<[string, number]> = [
      ['1:1', 1],
      ['4:3', 4 / 3],
      ['3:4', 3 / 4],
      ['16:9', 16 / 9],
      ['9:16', 9 / 16],
      ['3:2', 3 / 2],
      ['2:3', 2 / 3],
      ['5:4', 5 / 4],
      ['4:5', 4 / 5],
    ];

    let best: { label: string; diff: number } | null = null;
    for (const [label, val] of COMMON) {
      const diff = Math.abs(r - val);
      if (!best || diff < best.diff) best = { label, diff };
    }
    if (best && best.diff < 0.03) return `${best.label}`;

    const gcd = (a: number, b: number): number => {
      let x = Math.abs(a);
      let y = Math.abs(b);
      while (y) {
        const t = x % y;
        x = y;
        y = t;
      }
      return x || 1;
    };
    const g = gcd(meta.w, meta.h);
    const sw = Math.round(meta.w / g);
    const sh = Math.round(meta.h / g);
    if (sw <= 30 && sh <= 30) return `${sw}:${sh}`;

    // Fallback: approximate ratio as a small integer fraction (always show a:b).
    const approx = (() => {
      const maxDen = 30;
      const maxIter = 12;
      let x = r;
      let a0 = Math.floor(x);
      let p0 = 1,
        q0 = 0;
      let p1 = a0,
        q1 = 1;
      for (let i = 0; i < maxIter; i++) {
        const frac = x - Math.floor(x);
        if (frac === 0) break;
        x = 1 / frac;
        const a = Math.floor(x);
        const p2 = a * p1 + p0;
        const q2 = a * q1 + q0;
        if (q2 > maxDen) break;
        p0 = p1;
        q0 = q1;
        p1 = p2;
        q1 = q2;
      }
      const num = Math.max(1, Math.round(p1));
      const den = Math.max(1, Math.round(q1));
      return [num, den] as const;
    })();

    return `${approx[0]}:${approx[1]}`;
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  loadMoreRef.current = () => {
    if (autoLoading) return;
    if (visible.length >= filtered.length) return;

    setAutoLoading(true);
    const nextBatch = filtered.slice(visible.length, visible.length + PAGE_SIZE);

    void preloadCoverDimensionsByUrl(coverUrls(nextBatch)).then((dims) => {
        applyDimensions(nextBatch, dims);
        setLimit((v) => Math.min(filtered.length, v + PAGE_SIZE));
      })
      .finally(() => {
        setAutoLoading(false);
      });
  };

  // Preload cover dimensions for the visible batch (reduces first-paint jump).
  useEffect(() => {
    let cancelled = false;
    const batch = filtered.slice(0, limit);
    void preloadCoverDimensionsByUrl(coverUrls(batch)).then((dims) => {
      if (!cancelled) applyDimensions(batch, dims);
    });
    return () => {
      cancelled = true;
    };
  }, [filtered, limit]);

  // Lookahead: preload the next batch before the sentinel fires.
  useEffect(() => {
    if (visible.length >= filtered.length) return;
    let cancelled = false;
    const upcoming = filtered.slice(visible.length, visible.length + PAGE_SIZE);
    void preloadCoverDimensionsByUrl(coverUrls(upcoming)).then((dims) => {
      if (!cancelled) applyDimensions(upcoming, dims);
    });
    return () => {
      cancelled = true;
    };
  }, [filtered, visible.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        loadMoreRef.current();
      },
      { root: null, rootMargin: '600px 0px', threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, autoLoading, filtered.length, visible.length]);

  const renderGalleryCard = (p: PromptGalleryItem) => {
    const delay = enteringDelays.get(p.id);
    const animate = delay !== undefined;

    return (
      <div
        className={animate ? 'op-gallery-card-enter' : undefined}
        style={animate ? { animationDelay: `${delay}ms` } : undefined}
      >
        <PromptGalleryCard
          layout="masonry"
          coverFit="cover"
          item={p}
          coverSrc={p.images[0]}
          coverSizes="(max-width: 1024px) 100vw, 33vw"
          coverAspectRatio={coverAspectFor(p)}
          modelBadge={p.model}
          description={p.description}
          tags={p.tags}
          aspectTag={formatAspectTag(p.id)}
          authorLabel={getAuthorLabel(p)}
          authorUrl={getAuthorUrl(p) ?? null}
          primaryCtaLabel={t('card.generate')}
          coverErrorText={t('gallery.coverLoadFailed')}
          cardHref={promptHref(locale, p.id)}
          onMeta={({ width, height }) => rememberCoverMeta(p, width, height)}
          onCtaClick={() => {
            router.push(`/${locale}/create?template=${encodeURIComponent(p.id)}`);
          }}
        />
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <OpenPromptsSiteHeader locale={locale} activeNav="gallery" langPathSuffix="/gallery" />

        <main className="w-full">
          <section className="px-6 pb-4 pt-8">
            <div className="mx-auto w-full max-w-7xl">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
                    {t('galleryPage.title')}
                  </h1>
                  <p className="mt-1 text-sm text-[var(--text2)]">{t('galleryPage.subtitle')}</p>
                </div>
                <div className="flex max-w-md flex-1 overflow-hidden rounded-xl border border-[var(--border2)] bg-[var(--surface)] sm:max-w-sm">
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      resetPagination();
                    }}
                    placeholder={t('hero.searchPlaceholder')}
                    className="w-full bg-transparent px-4 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)]"
                  />
                  <button
                    type="button"
                    className="min-w-[80px] whitespace-nowrap bg-[var(--amber)] px-4 text-sm font-semibold text-[var(--bg)] hover:bg-[var(--amber2)]"
                  >
                    {t('hero.searchButton')}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="px-6 pb-4">
            <div className="mx-auto w-full max-w-7xl">
              <GalleryFilterStrip
                models={models}
                model={model}
                onModelChange={handleModelChange}
                categoryId={categoryId}
                onCategoryChange={handleCategoryChange}
                subTag={subTag}
                onSubTagChange={handleSubTagChange}
                subTags={subTags}
                allModelsLabel={t('filters.allModels')}
                allCategoriesLabel={t('filters.allCategories')}
                categoryLabel={categoryLabel}
                subTagLabel={subTagLabel}
                showingLabel={t('gallery.showing', { shown: visible.length, total: filtered.length })}
              />
            </div>
          </section>

          <section className="px-6 pb-6">
            <div className="mx-auto w-full max-w-7xl">
            <div className="mb-4 flex items-center gap-3 text-[11px] tracking-[0.18em] text-[var(--text3)]">
              <span className="h-1 w-1 rounded-full bg-[var(--amber)]" />
              {sectionLabel}
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <PromptGalleryMasonry
              items={visible}
              itemKey={(p) => p.id}
              layoutKey={Object.keys(ratioByUrl).join(',')}
              renderItem={renderGalleryCard}
            />

            <div ref={sentinelRef} className="mt-8 flex justify-center">
              {hasMore ? (
                <div
                  className={`op-gallery-load-more${autoLoading ? '' : ' done'}`}
                  aria-busy={autoLoading}
                >
                  <span className="op-gallery-load-more-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>{t('gallery.loadMore')}</span>
                </div>
              ) : visible.length > 0 ? (
                <div className="op-gallery-load-more done">{t('gallery.noMore')}</div>
              ) : null}
            </div>
            </div>
          </section>
        </main>

        <OpenPromptsSiteFooter locale={locale} />
      </div>

    </>
  );
}

