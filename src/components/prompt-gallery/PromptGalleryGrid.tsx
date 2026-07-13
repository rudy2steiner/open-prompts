'use client';

import '../../app/[locale]/gallery/gallery-page.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { PromptGalleryCard } from '~/components/prompt-gallery/PromptGalleryCard';
import { PromptGalleryMasonry } from '~/components/prompt-gallery/PromptGalleryMasonry';
import { galleryAuthorLabel, galleryAuthorUrl } from '~/lib/prompts/gallery-attribution';
import { formatAspectTag } from '~/lib/prompts/format-aspect-tag';
import { buildLocaleHref } from '~/lib/op-locale';
import {
  dimensionsToAspectRatio,
  preloadCoverDimensionsByUrl,
  type CoverDimensions,
} from '~/lib/prompts/preload-cover-dimensions';
import { promptHref } from '~/lib/prompts/seo-paths';

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
  className?: string;
};

const PAGE_SIZE = 18;
const DEFAULT_COVER_ASPECT = '1.6';

function coverUrls(items: PromptGalleryItem[]): string[] {
  return items.map((p) => p.images[0]).filter(Boolean);
}

export function PromptGalleryGrid({ locale, prompts, className }: Props) {
  const t = useTranslations('OpenPrompts');
  const router = useRouter();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [autoLoading, setAutoLoading] = useState(false);
  const [enteringDelays, setEnteringDelays] = useState<Map<string, number>>(() => new Map());
  const prevVisibleLenRef = useRef(0);
  const prevFilteredLenRef = useRef(prompts.length);
  const [ratioByUrl, setRatioByUrl] = useState<Record<string, string>>({});
  const [ratioMetaById, setRatioMetaById] = useState<Record<string, { w: number; h: number }>>({});

  const visible = useMemo(() => prompts.slice(0, limit), [prompts, limit]);
  const hasMore = visible.length < prompts.length;

  useEffect(() => {
    const isLoadMore =
      visible.length > prevVisibleLenRef.current &&
      prompts.length === prevFilteredLenRef.current;

    if (isLoadMore) {
      const batch = visible.slice(prevVisibleLenRef.current);
      const delays = new Map<string, number>();
      batch.forEach((item, index) => {
        delays.set(item.id, index * 55);
      });
      setEnteringDelays(delays);
      const timer = window.setTimeout(() => setEnteringDelays(new Map()), 900);
      prevVisibleLenRef.current = visible.length;
      prevFilteredLenRef.current = prompts.length;
      return () => window.clearTimeout(timer);
    }

    if (
      prompts.length !== prevFilteredLenRef.current ||
      visible.length < prevVisibleLenRef.current
    ) {
      setEnteringDelays(new Map());
    }

    prevVisibleLenRef.current = visible.length;
    prevFilteredLenRef.current = prompts.length;
  }, [visible, prompts.length]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [prompts]);

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

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});

  loadMoreRef.current = () => {
    if (autoLoading) return;
    if (visible.length >= prompts.length) return;

    setAutoLoading(true);
    const nextBatch = prompts.slice(visible.length, visible.length + PAGE_SIZE);

    void preloadCoverDimensionsByUrl(coverUrls(nextBatch))
      .then((dims) => {
        applyDimensions(nextBatch, dims);
        setLimit((v) => Math.min(prompts.length, v + PAGE_SIZE));
      })
      .finally(() => {
        setAutoLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    const batch = prompts.slice(0, limit);
    void preloadCoverDimensionsByUrl(coverUrls(batch)).then((dims) => {
      if (!cancelled) applyDimensions(batch, dims);
    });
    return () => {
      cancelled = true;
    };
  }, [prompts, limit]);

  useEffect(() => {
    if (visible.length >= prompts.length) return;
    let cancelled = false;
    const upcoming = prompts.slice(visible.length, visible.length + PAGE_SIZE);
    void preloadCoverDimensionsByUrl(coverUrls(upcoming)).then((dims) => {
      if (!cancelled) applyDimensions(upcoming, dims);
    });
    return () => {
      cancelled = true;
    };
  }, [prompts, visible.length]);

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
  }, [hasMore, autoLoading, prompts.length, visible.length]);

  const createHref = (id: string) =>
    buildLocaleHref(locale, `/create?template=${encodeURIComponent(id)}`);

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
          aspectTag={formatAspectTag(ratioMetaById[p.id])}
          authorLabel={getAuthorLabel(p)}
          authorUrl={getAuthorUrl(p) ?? null}
          primaryCtaLabel={t('card.generate')}
          coverErrorText={t('gallery.coverLoadFailed')}
          cardHref={promptHref(locale, p.id)}
          onMeta={({ width, height }) => rememberCoverMeta(p, width, height)}
          onCtaClick={() => {
            router.push(createHref(p.id));
          }}
        />
      </div>
    );
  };

  return (
    <div className={className ?? 'mt-8'}>
      <PromptGalleryMasonry
        items={visible}
        itemKey={(p) => p.id}
        layoutKey={Object.keys(ratioByUrl).join(',')}
        renderItem={renderGalleryCard}
      />
      {hasMore ? (
        <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
      ) : null}
    </div>
  );
}
