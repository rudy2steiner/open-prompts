'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { localeApiPath } from '~/lib/locale-api-path';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import type { PromptDownloadFormat, PromptDownloadImageMode } from '~/lib/prompts/prompt-download';

type CatalogItem = { id: string; title: string; model: string; previewSrc: string | null; imageCount: number };

export function PromptDownloadDialog({
  open,
  locale,
  onClose,
}: {
  open: boolean;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations('OpenPrompts');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [limit, setLimit] = useState<number | null>(null);
  const [takenIds, setTakenIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [count, setCount] = useState('');
  const [quotaError, setQuotaError] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [format, setFormat] = useState<PromptDownloadFormat>('html');
  const [imageMode, setImageMode] = useState<PromptDownloadImageMode>('embedded');
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed' | 'saving'>('loading');
  const activeDownload = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setStatus('loading');
    setSelected(new Set());
    setTakenIds([]);
    setQuotaError(false);
    setExportError(false);
    setFormat('html');
    setImageMode('embedded');
    setQuery('');
    setCount('');
    void fetch(localeApiPath(locale, '/api/prompts/download'), { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 402) {
          window.location.assign(localeApiPath(locale, '/pricing'));
          return null;
        }
        if (!response.ok) throw new Error('catalog');
        return response.json() as Promise<{ limit?: number | null; taken?: string[]; items?: CatalogItem[] }>;
      })
      .then((data) => {
        if (!live || !data) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTakenIds(Array.isArray(data.taken) ? data.taken.filter((id) => typeof id === 'string') : []);
        setLimit(typeof data.limit === 'number' ? data.limit : null);
        setStatus('ready');
      })
      .catch(() => {
        if (live) setStatus('failed');
      });
    return () => {
      live = false;
      activeDownload.current?.abort();
    };
  }, [open, locale]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.title.toLowerCase().includes(needle) || item.model.toLowerCase().includes(needle));
  }, [items, query]);

  const taken = useMemo(() => new Set(takenIds), [takenIds]);
  const remaining = limit == null ? null : Math.max(0, limit - taken.size);
  const newlySelected = Array.from(selected).filter((id) => !taken.has(id)).length;

  const chooseFresh = (source: CatalogItem[], amount: number) => {
    const room = remaining == null ? amount : Math.min(amount, remaining);
    setQuotaError(false);
    setSelected(new Set(source.filter((item) => !taken.has(item.id)).slice(0, Math.max(0, room)).map((item) => item.id)));
  };

  const toggle = (id: string) => {
    setQuotaError(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (!taken.has(id) && remaining != null) {
        const fresh = Array.from(next).filter((item) => !taken.has(item)).length;
        if (fresh >= remaining) return next;
      }
      next.add(id);
      return next;
    });
  };

  const download = async () => {
    const ids = items.filter((item) => selected.has(item.id)).map((item) => item.id);
    if (ids.length < 1) return;
    const controller = new AbortController();
    activeDownload.current = controller;
    setStatus('saving');
    setExportError(false);
    try {
      const response = await fetch(localeApiPath(locale, '/api/prompts/download'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids, format, imageMode }),
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      if (response.status === 402) {
        window.location.assign(localeApiPath(locale, '/pricing'));
        return;
      }
      if (response.status === 403) {
        setQuotaError(true);
        setStatus('ready');
        return;
      }
      if (!response.ok) throw new Error('export');
      const blob = await response.blob();
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `open-prompts.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('ready');
      onClose();
    } catch {
      if (!controller.signal.aborted) {
        setExportError(true);
        setStatus('ready');
      }
    } finally {
      if (activeDownload.current === controller) activeDownload.current = null;
    }
  };

  if (!open) return null;
  const atCap = remaining != null && newlySelected >= remaining;
  const dialog = (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/45 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="flex max-h-[min(720px,calc(100vh-40px))] w-full max-w-[560px] flex-col rounded-[14px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[0_24px_70px_rgba(17,17,17,0.27)]" role="dialog" aria-modal="true" aria-labelledby="prompt-download-title">
        <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
          <div>
            <h2 id="prompt-download-title" className="text-lg font-semibold">{t('gallery.downloadTitle')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text3)]">{t('gallery.downloadHint')}</p>
          </div>
          <button type="button" className="h-8 w-8 shrink-0 text-2xl leading-none text-[var(--text3)]" aria-label={t('gallery.downloadClose')} onClick={onClose}>×</button>
        </header>
        <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('gallery.downloadSearch')}
            className="h-9 min-w-[160px] flex-1 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--amber)]"
          />
          <input
            value={count}
            onChange={(event) => setCount(event.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            aria-label={t('gallery.downloadCount')}
            placeholder={t('gallery.downloadCount')}
            className="h-9 w-20 rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--amber)]"
          />
          <button
            type="button"
            className="h-9 rounded-lg border border-[var(--border2)] px-3 text-sm"
            onClick={() => {
              const amount = Number(count);
              if (!Number.isFinite(amount) || amount < 1) return;
              chooseFresh(visible, amount);
            }}
          >
            {t('gallery.downloadPickCount')}
          </button>
          <button
            type="button"
            className="h-9 rounded-lg border border-[var(--border2)] px-3 text-sm"
            onClick={() => chooseFresh(items, remaining ?? items.length)}
          >
            {t('gallery.downloadAll')}
          </button>
        </div>
        <fieldset className="flex gap-4 px-5 pb-4" disabled={status === 'saving'}>
          <legend className="mb-2 text-xs text-[var(--text3)]">{t('gallery.downloadFormat')}</legend>
          {(['html', 'zip'] as const).map(value => <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--border2)] px-3 text-sm">
            <input type="radio" name="prompt-download-format" value={value} checked={format === value} onChange={() => setFormat(value)} />
            {t(value === 'html' ? 'gallery.downloadHtml' : 'gallery.downloadZip')}
          </label>)}
        </fieldset>
        <fieldset className="flex flex-wrap gap-3 px-5 pb-3" disabled={status === 'saving'}>
          <legend className="mb-2 text-xs text-[var(--text3)]">{t('gallery.downloadImageMode')}</legend>
          {(['embedded', 'links'] as const).map(value => <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--border2)] px-3 text-sm">
            <input type="radio" name="prompt-download-images" value={value} checked={imageMode === value} onChange={() => setImageMode(value)} />
            {t(value === 'embedded' ? 'gallery.downloadImagesEmbedded' : 'gallery.downloadImagesLinks')}
          </label>)}
        </fieldset>
        <p className="px-5 pb-3 text-xs leading-relaxed text-[var(--text3)]">{t(imageMode === 'links' ? 'gallery.downloadImagesLinksHint' : format === 'html' ? 'gallery.downloadHtmlHint' : 'gallery.downloadZipHint')}</p>
        <div className="min-h-0 flex-1 overflow-y-auto border-y border-[var(--border)]">
          {status === 'loading' || status === 'failed' ? (
            <p className="px-5 py-8 text-sm text-[var(--text3)]">{status === 'loading' ? t('gallery.downloadLoading') : t('gallery.downloadFailed')}</p>
          ) : visible.map((item) => {
            const checked = selected.has(item.id);
            const saved = taken.has(item.id);
            return (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 px-5 py-2 hover:bg-[var(--surface2)]">
                <input type="checkbox" checked={checked} disabled={status === 'saving' || (!checked && !saved && atCap)} onChange={() => toggle(item.id)} />
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface2)]">
                  {item.previewSrc ? <CoverImage src={item.previewSrc} alt={item.title} sizes="64px" className="object-contain" errorText={t('gallery.coverLoadFailed')} /> : <span className="grid h-full place-items-center text-[var(--text3)]">—</span>}
                  {item.imageCount > 1 ? <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 text-[10px] text-white">{item.imageCount}</span> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{item.title}</span>
                  <span className="block truncate text-[11px] text-[var(--text3)]">{item.model}</span>
                </span>
                {saved ? <span className="shrink-0 text-[11px] text-[var(--text3)]">{t('gallery.downloadAlready')}</span> : null}
              </label>
            );
          })}
        </div>
        {exportError ? <p role="alert" className="px-5 pt-3 text-xs text-red-500">{t('gallery.downloadExportFailed')}</p> : null}
        <footer className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs text-[var(--text3)]">
            {t('gallery.downloadTaken', { count: taken.size })}
            {' · '}
            {remaining == null ? t('gallery.downloadUnlimited') : t('gallery.downloadRemaining', { count: remaining })}
            {' · '}
            {t('gallery.downloadNew', { count: newlySelected })}
            {quotaError ? ` · ${t('gallery.downloadQuota')}` : ''}
          </p>
          <button
            type="button"
            disabled={selected.size < 1 || status === 'saving'}
            className="rounded-md bg-[var(--amber)] px-4 py-2 text-sm font-semibold text-[var(--bg)] disabled:opacity-40"
            onClick={() => void download()}
          >
            {status === 'saving' ? t('gallery.downloadPackaging') : t('gallery.downloadAction')}
          </button>
        </footer>
      </section>
    </div>
  );
  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
