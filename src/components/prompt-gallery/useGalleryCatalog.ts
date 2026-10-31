'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sortGalleryByDate } from '~/lib/prompts/gallery-order';
import type { PromptGalleryItem } from '~/data/promptGallery';

type ActiveRequest = { kind: 'page' | 'full'; controller: AbortController; promise: Promise<boolean> };

/** 首屏与滚动只读取卡片预览；完整正文目录仅供用户发起的搜索和筛选。 */
export function useGalleryCatalog(initial: PromptGalleryItem[], initialTotal: number, complete: boolean, previewBaseIsUnfiltered = true) {
  const [prompts, setPrompts] = useState(() => sortGalleryByDate(initial));
  const [total, setTotal] = useState(initialTotal);
  const [catalogReady, setCatalogReady] = useState(complete);
  const [nextOffset, setNextOffset] = useState<number | null>(!previewBaseIsUnfiltered ? 0 : initial.length < initialTotal ? initial.length : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const active = useRef<ActiveRequest | null>(null);
  useEffect(() => () => {
    const request = active.current;
    active.current = null;
    request?.controller.abort();
  }, []);

  const start = useCallback((kind: 'page' | 'full', url: string, apply: (data: any) => void) => {
    const previous = active.current;
    if (previous?.kind === kind || (kind === 'page' && previous)) return previous.promise;
    // 搜索优先于尚未完成的预览页，旧响应不得覆盖搜索目录。
    active.current = null;
    previous?.controller.abort();
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    const timeout = setTimeout(() => controller.abort(), kind === 'page' ? 20000 : 60000);
    const promise = fetch(url, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Gallery request failed');
      const data = await response.json();
      if (active.current?.controller !== controller) return false;
      apply(data);
      return true;
    }).catch(() => {
      if (active.current?.controller === controller) setError(true);
      return false;
    }).finally(() => {
      clearTimeout(timeout);
      if (active.current?.controller === controller) {
        active.current = null;
        setLoading(false);
      }
    });
    active.current = { kind, controller, promise };
    return promise;
  }, []);

  const ensureCatalog = useCallback((): Promise<boolean> => {
    if (catalogReady) return Promise.resolve(true);
    return start('full', '/api/prompts', data => {
      if (!Array.isArray(data.prompts)) throw new Error('Invalid gallery catalog');
      setPrompts(sortGalleryByDate<PromptGalleryItem>(data.prompts));
      setTotal(data.prompts.length);
      setCatalogReady(true);
      setNextOffset(null);
    });
  }, [catalogReady, start]);

  const loadNextPage = useCallback((): Promise<boolean> => {
    if (catalogReady || nextOffset === null) return Promise.resolve(false);
    // 筛选首批与全目录的 offset 不可混用；清空筛选后先重试完整目录。
    if (!previewBaseIsUnfiltered) return ensureCatalog();
    const offset = nextOffset;
    return start('page', `/api/gallery-bootstrap?offset=${offset}`, data => {
      if (!Array.isArray(data.items) || data.items.some((item: PromptGalleryItem) => !item || typeof item.id !== 'string') || !Number.isSafeInteger(data.total) || data.total < 0) throw new Error('Invalid gallery page');
      setPrompts(previous => {
        const seen = new Set(previous.map(item => item.id));
        return sortGalleryByDate([...previous, ...data.items.filter((item: PromptGalleryItem) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })]);
      });
      setTotal(data.total);
      setNextOffset(data.items.length && Number.isSafeInteger(data.nextOffset) && data.nextOffset > offset ? data.nextOffset : null);
    });
  }, [catalogReady, nextOffset, start, previewBaseIsUnfiltered, ensureCatalog]);

  return { prompts, total, catalogReady, nextOffset, loading, error, ensureCatalog, loadNextPage };
}
