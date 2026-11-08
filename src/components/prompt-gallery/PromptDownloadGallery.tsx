'use client';

import {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {NextIntlClientProvider, useTranslations} from 'next-intl';
import type {PromptGalleryItem} from '~/data/promptGallery';
import {PromptGalleryCard} from './PromptGalleryCard';
import {PromptGalleryMasonry} from './PromptGalleryMasonry';
import {PromptDetailPanel} from './PromptDetailPanel';
import {PromptGallerySwipeViewer} from './PromptGallerySwipeViewer';
import {galleryAuthorLabel, galleryAuthorUrl} from '~/lib/prompts/gallery-attribution';
import {promptGalleryItemToDetailItem} from '~/lib/prompts/prompt-detail-item';
import {formatAspectTag} from '~/lib/prompts/format-aspect-tag';
import {applyOpThemeToDocument, readOpThemeFromStorage} from '~/lib/op-theme';
import type {AbstractIntlMessages} from 'next-intl';

type Data = {items: PromptGalleryItem[]; locale: string; messages: AbstractIntlMessages; imageMode?: 'embedded' | 'links'};
const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const rasterTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

async function fetchCacheImage(source: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch(source, {credentials: 'omit', redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)])});
  const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
  const maxBytes = 20 * 1024 * 1024;
  if (!response.ok || !response.body || !rasterTypes.has(type) || Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new Error('Image cannot be cached');
  }
  const chunks: BlobPart[] = [];
  const reader = response.body.getReader();
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw new Error('Image exceeds cache size limit');
      chunks.push(value.slice());
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {reader.releaseLock();}
  const blob = new Blob(chunks, {type});
  const bitmap = await createImageBitmap(blob);
  bitmap.close();
  return blob;
}

function Gallery({items, locale, imageMode}: Omit<Data, 'messages'>) {
  const t = useTranslations('OpenPrompts');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<PromptGalleryItem | null>(null);
  const [preview, setPreview] = useState<PromptGalleryItem | null>(null);
  const [ratios, setRatios] = useState<Record<string, {w: number; h: number}>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readOpThemeFromStorage());
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [cache, setCache] = useState({processed: 0, count: 0, total: 0, failed: 0, unavailable: false});
  const displayItems = useMemo(() => imageMode === 'links' ? items.map(item => ({...item, images: item.images.map(source => source.startsWith('data:') ? source : resolved[source] ?? placeholder)})) : items, [items, imageMode, resolved]);
  const shownDetail = detail ? displayItems.find(item => item.id === detail.id) : null;
  const shownPreview = preview ? displayItems.find(item => item.id === preview.id) : null;
  const visible = displayItems.filter(item => `${item.title} ${item.description} ${item.prompt} ${item.model} ${item.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (imageMode !== 'links') return;
    const sources = Array.from(new Set(items.flatMap(item => item.images).filter(source => /^https?:\/\//.test(source))));
    const controller = new AbortController();
    const urls: string[] = [];
    let live = true;
    let database: IDBDatabase | null = null;
    let writable = true;
    let next = 0;
    setCache({processed: 0, count: 0, total: sources.length, failed: 0, unavailable: false});
    const unavailable = () => {if (live) setCache(previous => ({...previous, unavailable: true}));};
    const run = async () => {
      try {
        database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('open-prompts-images', 1);
          let blocked = false;
          request.onupgradeneeded = () => {request.result.createObjectStore('images');};
          request.onerror = () => reject(request.error);
          request.onblocked = () => {blocked = true; reject(new Error('Image cache is blocked'));};
          request.onsuccess = () => {
            if (blocked || !live) request.result.close();
            resolve(request.result);
          };
        });
        database.onversionchange = () => {database?.close();};
      } catch {unavailable();}
      const worker = async () => {
        while (live && next < sources.length) {
          const source = sources[next++]!;
          let persisted = false;
          try {
            let blob: Blob | undefined;
            if (database) {
              try {
                blob = await new Promise<Blob | undefined>((resolve, reject) => {
                  const request = database!.transaction('images').objectStore('images').get(source);
                  request.onsuccess = () => resolve(request.result instanceof Blob && rasterTypes.has(request.result.type) ? request.result : undefined);
                  request.onerror = () => reject(request.error);
                });
              } catch {unavailable();}
            }
            if (blob) {
              try {
                if (blob.size > 20 * 1024 * 1024) throw new Error('Image exceeds cache size limit');
                const bitmap = await createImageBitmap(blob);
                bitmap.close();
              } catch {blob = undefined;}
            }
            persisted = !!blob;
            if (!blob) {
              blob = await fetchCacheImage(source, controller.signal);
              if (database && writable) {
                try {
                  await new Promise<void>((resolve, reject) => {
                    const transaction = database!.transaction('images', 'readwrite');
                    transaction.oncomplete = () => resolve();
                    transaction.onerror = transaction.onabort = () => reject(transaction.error);
                    transaction.objectStore('images').put(blob, source);
                  });
                  persisted = true;
                } catch {writable = false; unavailable();}
              }
            }
            if (!live) break;
            const url = URL.createObjectURL(blob);
            urls.push(url);
            setResolved(previous => ({...previous, [source]: url}));
          } catch {
            if (!live) break;
            setResolved(previous => ({...previous, [source]: source}));
            setCache(previous => ({...previous, failed: previous.failed + 1}));
          }
          if (live) setCache(previous => ({...previous, processed: previous.processed + 1, count: previous.count + (persisted ? 1 : 0)}));
        }
      };
      await Promise.all(Array.from({length: Math.min(3, sources.length)}, worker));
    };
    void run();
    return () => {
      live = false;
      controller.abort();
      database?.close();
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [items, imageMode]);

  useEffect(() => {applyOpThemeToDocument(theme);}, [theme]);
  useEffect(() => {
    const update = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get('prompt');
      setDetail(items.find(item => item.id === id) ?? null);
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [items]);

  return <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
    <header className="border-b border-[var(--border)] px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a className="text-lg font-semibold" href="#">Open Prompts</a>
        <button type="button" className="h-10 rounded-xl border border-[var(--border)] px-3" aria-label={t('header.themeToggle')} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '◐' : '◑'}</button>
      </div>
    </header>
    <main className="px-6 pb-10 pt-8">
      <div className="mx-auto w-full max-w-7xl">
        {imageMode === 'links' && cache.total > 0 ? <div role="status" aria-live="polite" className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p>{cache.unavailable ? t('gallery.downloadCacheUnavailable') : cache.processed < cache.total ? t('gallery.downloadCacheProgress', {count: cache.count, total: cache.total}) : cache.failed ? t('gallery.downloadCacheIncomplete', {count: cache.failed}) : t('gallery.downloadCacheComplete', {count: cache.count, total: cache.total})}</p>
          <p className="mt-2 text-xs text-[var(--text3)]">{t('gallery.downloadCacheHint')}</p>
        </div> : null}
        {shownDetail ? <>
          <a href="#" className="mb-5 inline-flex min-h-10 items-center text-sm text-[var(--text2)]">← {t('galleryPage.title')}</a>
          <PromptDetailPanel key={shownDetail.id} item={promptGalleryItemToDetailItem(shownDetail)} locale={locale} showGenerate={false} variant="page" />
        </> : <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('galleryPage.title')}</h1><p className="mt-1 text-sm text-[var(--text2)]">{t('gallery.downloadChosen', {count: items.length})}</p></div>
            <input className="h-11 w-full rounded-xl border border-[var(--border2)] bg-[var(--surface)] px-4 sm:max-w-sm" value={query} aria-label={t('gallery.downloadSearch')} placeholder={t('gallery.downloadSearch')} onChange={event => setQuery(event.target.value)} />
          </div>
          <PromptGalleryMasonry bootstrap={false} items={visible} itemKey={item => item.id} layoutKey={JSON.stringify(ratios)} renderItem={item => <PromptGalleryCard
            item={item} layout="masonry" naturalCover coverFit="cover" coverSrc={item.images[0]} coverSizes="(max-width: 1024px) 100vw, 33vw"
            coverAspectRatio={ratios[item.id] ? `${ratios[item.id].w} / ${ratios[item.id].h}` : '16 / 9'} modelBadge={item.model} description={item.description} tags={item.tags} aspectTag={formatAspectTag(ratios[item.id])}
            authorLabel={galleryAuthorLabel(item, t('card.community'))} authorUrl={galleryAuthorUrl(item)} coverErrorText={t('gallery.coverLoadFailed')}
            cardHref={`#prompt=${encodeURIComponent(item.id)}`} onImageClick={() => setPreview(item)}
            onMeta={({width, height}) => {setRatios(previous => previous[item.id]?.w === width && previous[item.id]?.h === height ? previous : {...previous, [item.id]: {w: width, h: height}});}}
          />} />
        </>}
      </div>
    </main>
    {shownPreview ? <PromptGallerySwipeViewer open onClose={() => setPreview(null)} images={shownPreview.images} title={shownPreview.title} imageKeyPrefix={shownPreview.id} coverLoadFailedText={t('gallery.coverLoadFailed')} closeLabel={t('createPage.viewerClose')} prevLabel={t('createPage.viewerPrev')} nextLabel={t('createPage.viewerNext')} /> : null}
  </div>;
}

const data: Data = JSON.parse(document.getElementById('prompt-download-data')!.textContent!);
createRoot(document.getElementById('prompt-download-root')!).render(<NextIntlClientProvider locale={data.locale} messages={data.messages} timeZone="UTC"><Gallery items={data.items} locale={data.locale} imageMode={data.imageMode} /></NextIntlClientProvider>);
