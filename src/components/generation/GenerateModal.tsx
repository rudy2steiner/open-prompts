'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { PROMPT_TEMPLATES } from '~/data/promptTemplates';
import { renderPromptTemplate, TemplateValidationError } from '~/lib/templates/render';
import { PROVIDER_CAPABILITIES } from '~/lib/generation/capabilities';
import {useTranslations} from 'next-intl';

type Props = {
  open: boolean;
  onClose: () => void;
  locale: string;
  item: PromptGalleryItem;
};

type UiState = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';

export function GenerateModal({ open, onClose, locale, item }: Props) {
  const t = useTranslations('OpenPrompts');
  const template = useMemo(() => {
    const id = item.templateId;
    return PROMPT_TEMPLATES.find((t) => t.id === id) ?? PROMPT_TEMPLATES[0];
  }, [item.templateId]);

  const [values, setValues] = useState<Record<string, any>>({});
  const [rendered, setRendered] = useState<{ prompt: string; negativePrompt?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>('atlascloud');
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [quality, setQuality] = useState<string>('1k');
  const [count, setCount] = useState<number>(1);

  const capabilities = PROVIDER_CAPABILITIES[provider] || PROVIDER_CAPABILITIES.atlascloud;

  const [uiState, setUiState] = useState<UiState>('idle');
  const [providerJobId, setProviderJobId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    // reset on open
    setValues({});
    setRendered(null);
    setError(null);
    setUiState('idle');
    setProviderJobId(null);
    setImages([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      const r = renderPromptTemplate(template, values);
      setRendered(r);
      setError(null);
    } catch (e: any) {
      if (e instanceof TemplateValidationError) {
        setRendered(null);
        setError(e.message);
        return;
      }
      setRendered(null);
      setError(t('gen.templateRenderFailed'));
    }
  }, [open, template, values]);

  useEffect(() => {
    if (!open) return;
    if (!providerJobId) return;
    if (uiState !== 'queued' && uiState !== 'running') return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/${locale}/api/generations/${encodeURIComponent(providerJobId)}`, {
          cache: 'no-store',
        }).then((r) => r.json());
        if (cancelled) return;
        if (res?.status === 'running' || res?.status === 'queued') {
          setUiState(res.status);
          return;
        }
        if (res?.status === 'succeeded') {
          setUiState('succeeded');
          setImages(Array.isArray(res.images) ? res.images : []);
          return;
        }
        setUiState('failed');
        setError(res?.error || t('gen.generationFailed'));
      } catch (e: any) {
        if (cancelled) return;
        setUiState('failed');
        setError(e?.message || t('gen.pollingFailed'));
      }
    };

    const interval = setInterval(tick, 2000);
    tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, locale, providerJobId, uiState]);

  const canGenerate = uiState === 'idle' || uiState === 'failed' || uiState === 'succeeded';

  const onGenerate = async () => {
    if (!rendered?.prompt) {
      setError(error || t('gen.missingPrompt'));
      return;
    }
    setError(null);
    setUiState('queued');
    setImages([]);
    try {
      const res = await fetch(`/${locale}/api/generations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          prompt: rendered.prompt,
          negativePrompt: rendered.negativePrompt,
          model: template.model,
          aspectRatio,
          quality,
          count,
        }),
      }).then((r) => r.json());

      if (res?.error) throw new Error(res.error);
      setProviderJobId(res.providerJobId);
      setUiState(res.status || 'queued');
    } catch (e: any) {
      setUiState('failed');
      setError(e?.message || t('gen.createFailed'));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-stone-900">{t('gen.title')}</div>
            <div className="truncate text-xs text-stone-500">{template.title}</div>
          </div>
          <button className="rounded-lg bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-2">
          <div className="border-b border-stone-200 p-5 md:border-b-0 md:border-r">
            <div className="text-xs font-semibold text-stone-500">{t('gen.params')}</div>
            <div className="mt-3 grid gap-3">
              {template.variables.map((v) => (
                <div key={v.name}>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-stone-600">
                    <span>
                      {v.label}
                      {v.required ? <span className="ml-1 text-red-500">*</span> : null}
                    </span>
                    <span className="text-stone-400">{v.type}</span>
                  </div>
                  {v.type === 'enum' ? (
                    <select
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-orange-400"
                      value={values[v.name] ?? v.default ?? ''}
                      onChange={(e) => setValues((cur) => ({ ...cur, [v.name]: e.target.value }))}
                    >
                      {(v.enum || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-orange-400"
                      value={values[v.name] ?? v.default ?? ''}
                      onChange={(e) => setValues((cur) => ({ ...cur, [v.name]: e.target.value }))}
                      placeholder={String(v.default ?? '')}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-stone-600">{t('gen.provider')}</div>
                <select
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-orange-400"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="atlascloud">atlascloud</option>
                  <option value="replicate">replicate</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-stone-600">{t('gen.count')}</div>
                <select
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-orange-400"
                  value={String(count)}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {Array.from({ length: capabilities.maxCount }, (_, i) => String(i + 1)).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-stone-600">{t('gen.aspectRatio')}</div>
                <select
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-orange-400"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  {capabilities.aspectRatios.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-stone-600">{t('gen.quality')}</div>
                <select
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-orange-400"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  {capabilities.qualities.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <button
                disabled={!canGenerate}
                onClick={onGenerate}
                className="w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uiState === 'queued' || uiState === 'running' ? t('gen.generating') : t('gen.generate')}
              </button>
              {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
              {providerJobId ? (
                <div className="mt-2 text-[11px] text-stone-500">
                  {t('gen.jobLabel')}: {providerJobId}
                </div>
              ) : null}
            </div>
          </div>

          <div className="p-5">
            <div className="text-xs font-semibold text-stone-500">{t('gen.prompt')}</div>
            <textarea
              className="mt-2 h-44 w-full resize-none rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-800 outline-none focus:border-orange-400"
              value={rendered?.prompt ?? ''}
              readOnly
            />

            <div className="mt-5 text-xs font-semibold text-stone-500">{t('gen.generatedImages')}</div>
            <div className="mt-3">
              {uiState === 'idle' ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
                  {t('gen.resultsPlaceholder')}
                </div>
              ) : null}
              {uiState === 'queued' || uiState === 'running' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-stone-200" />
                  ))}
                </div>
              ) : null}
              {uiState === 'succeeded' ? (
                images.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                        title={t('gen.openDownload')}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
                    {t('gen.successNoImages')}
                  </div>
                )
              ) : null}
              {uiState === 'failed' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {t('gen.failedPrefix')}
                  {error || t('gen.tryAgain')}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

