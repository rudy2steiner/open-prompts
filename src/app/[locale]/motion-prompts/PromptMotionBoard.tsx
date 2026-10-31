'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MotionMasonry } from './MotionMasonry';
import { buildLocaleHref } from '~/lib/op-locale';
import { MOTION_CATEGORY_IDS, type MotionFacets, type MotionPage, type MotionSort, type MotionSummary } from '~/lib/motion/types';
import { MotionMedia } from './MotionMedia';

const itemKey = (entry: MotionSummary) => entry.id;
function MotionCard({ entry, locale }: { entry: MotionSummary; locale: string }) {
  const t = useTranslations('OpenPrompts.promptMotionPage');
  const router = useRouter();
  const href = buildLocaleHref(locale, `/motion-prompts/${entry.slug}`);
  const metric = entry.popularity;
  const date = metric.observedAt ? new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(metric.observedAt)) : '';
  return <article className="motion-card">
    <div className="motion-card-media"><MotionMedia entry={entry} preview /></div>
    <div className="motion-card-body">
      <div className="motion-card-meta"><span>{entry.model}</span></div>
      <h3><Link className="motion-card-detail" href={href} prefetch={false} onMouseEnter={() => router.prefetch(href)} onFocus={() => router.prefetch(href)}>{entry.title}</Link></h3>
      <p className="motion-card-creator"><a href={entry.sourceUrl} target="_blank" rel="noreferrer">@{entry.author} <span aria-hidden="true">↗</span></a></p>
      <div className="motion-popularity" title={metric.observedAt ? t('metricsObserved', { date }) : t('metricsUnknown')}>
        <span>{metric.likes !== null ? t('likeCount', { count: metric.likes }) : metric.stars !== null ? `${metric.approximate ? t('approximately') : ''}${t('repoStarCount', { count: metric.stars })}` : t('metricsUnknown')}</span>
        {metric.observedAt && <time dateTime={metric.observedAt}>{date}</time>}
      </div>
      <div className="motion-card-tags"><span>{t(`categoryNames.${entry.category}`)}</span></div>
    </div>
  </article>;
}

function MotionResults({ initialPage, category, model, sort, locale }: { initialPage?: MotionPage; category: string; model: string; sort: MotionSort; locale: string }) {
  const t = useTranslations('OpenPrompts.promptMotionPage');
  const [page, setPage] = useState<MotionPage>(initialPage ?? { items: [], total: 0, nextOffset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (request.current || page.nextOffset === null) return;
    if (page.items.length > 0 && page.nextOffset >= page.total) {
      setError(false);
      setPage(previous => ({ ...previous, nextOffset: null }));
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ category, model, sort, offset: String(page.nextOffset) });
      const response = await fetch(`/api/motion-prompts?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('Motion catalog request failed');
      const next: MotionPage = await response.json();
      if (!controller.signal.aborted) setPage(previous => ({
        ...next,
        items: [...previous.items, ...next.items],
        nextOffset: !next.items.length || next.nextOffset === null || next.nextOffset >= next.total ? null : next.nextOffset,
      }));
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) { request.current = null; setLoading(false); }
    }
  }, [category, model, sort, page.nextOffset, page.total, page.items.length]);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  useEffect(() => {
    const element = sentinel.current;
    if (!element || page.nextOffset === null || error || loading) return;
    // 提前两屏读取下一批卡片，让请求有足够时间完成；视频仍按可见范围加载。
    if (!page.items.length) { void load(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void load();
    }, { rootMargin: `0px 0px ${Math.max(1200, window.innerHeight * 2)}px 0px` });
    observer.observe(element);
    return () => observer.disconnect();
  }, [page.nextOffset, page.items.length, error, loading, load]);
  const renderItem = useCallback((entry: MotionSummary) => <MotionCard entry={entry} locale={locale} />, [locale]);
  return <>
    {page.items.length > 0 && <div className="motion-gallery"><MotionMasonry items={page.items} itemKey={itemKey} renderItem={renderItem} /></div>}
    {!loading && !error && page.total === 0 && page.nextOffset === null && <p className="motion-empty">{t('empty')}</p>}
    <div ref={sentinel} className="motion-load-more" aria-live="polite" aria-busy={loading}>
      {error && <span role="alert">{t('loadError')}</span>}
      {page.nextOffset !== null && <button type="button" disabled={loading} onClick={() => void load()}>{!error && <span className="motion-load-more-dots" aria-hidden="true"><span /><span /><span /></span>}{error ? t('retry') : t('loadMore')}</button>}
      {page.nextOffset === null && page.items.length > 0 && <span>{t('allLoaded')}</span>}
    </div>
  </>;
}

export function PromptMotionBoard({ locale, initialPage, facets }: { locale: string; initialPage: MotionPage; facets: MotionFacets }) {
  const t = useTranslations('OpenPrompts.promptMotionPage');
  const [sort, setSort] = useState<MotionSort>('likes');
  const [category, setCategory] = useState('all');
  const [model, setModel] = useState('all');
  return <div>
    <div className="motion-categories" role="group" aria-label={t('categoriesLabel')}>
      <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>{t('filters.all')} <span>{facets.total}</span></button>
      {MOTION_CATEGORY_IDS.map(id => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{t(`categoryNames.${id}`)} <span>{facets.categories[id] || 0}</span></button>)}
    </div>
    <div className="motion-filter-row"><div className="motion-categories motion-models" role="group" aria-label={t('modelFilter')}>
      <button type="button" aria-pressed={model === 'all'} onClick={() => setModel('all')}>{t('allModels')} <span>{facets.total}</span></button>
      {Object.entries(facets.models).sort((a, b) => a[0] === 'Other' ? 1 : b[0] === 'Other' ? -1 : b[1] - a[1]).map(([name, count]) => <button key={name} type="button" aria-pressed={model === name} onClick={() => setModel(name)}>{name === 'Other' ? t('otherModels') : name} <span>{count}</span></button>)}
    </div><label className="motion-sort-control">{t('sortLabel')}<select value={sort} title={sort === 'likes' ? t('likesSortNote') : sort === 'stars' ? t('starsSortNote') : t('curatedSortNote')} onChange={event => setSort(event.target.value as MotionSort)}>
      <option value="likes">{t('sortLikes')}</option><option value="stars">{t('sortStars')}</option><option value="curated">{t('sortCurated')}</option>
    </select></label></div>
    <MotionResults key={`${category}:${model}:${sort}`} initialPage={category === 'all' && model === 'all' && sort === 'likes' ? initialPage : undefined} category={category} model={model} sort={sort} locale={locale} />
  </div>;
}
