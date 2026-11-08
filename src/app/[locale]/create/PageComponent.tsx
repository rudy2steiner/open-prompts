'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import { PromptGalleryMasonry } from '~/components/prompt-gallery/PromptGalleryMasonry';
import '../image-prompts/gallery-page.css';
import { PromptGallerySwipeViewer } from '~/components/prompt-gallery/PromptGallerySwipeViewer';
import { CreateTemplatePicker } from '~/components/create/CreateTemplatePicker';
import { GenerationImageTile } from '~/components/create/GenerationImageTile';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { IMAGE_RESOLUTIONS, isModelComingSoon, modelDisplayLabel, PROVIDER_CAPABILITIES, qualityDisplayLabel, referenceImageLimit } from '~/lib/generation/capabilities';
import { createHistoryStore, HISTORY_STORAGE_KEY, type HistoryEntry } from '~/lib/create/history';
import { createHistoryImageCache, HISTORY_IMAGE_PLACEHOLDER, isHistoryImageSource } from '~/lib/create/history-images';
import { CREATION_TYPES, creationTypeHref, createWithModeHref, type CreateImageMode, parseCreateImageMode, pickCreationTypeInspiration } from '~/lib/generation/creation-types';
import { notifyCreditsChanged } from '~/lib/billing/credits-changed';
import { generateButtonCredits, shouldOpenPricing } from '~/lib/billing/generation-charge';
import { GenerationBillingPrompt, generationBillingOffer } from '~/components/generation/GenerationBillingPrompt';
import { signIn, useSession } from 'next-auth/react';
import { pickAtlasSize } from '~/lib/generation/providers/atlascloud';
import type { ImageResolution } from '~/lib/generation/types';
import { uploadFileError } from '~/lib/generation/upload-media';
import { getOrCreateUserId } from '~/lib/credits/fingerprint';
import { localeApiPath } from '~/lib/locale-api-path';
import { galleryCoverUrl } from '~/lib/prompts/gallery-cover-url';
import { resolveCreationSiteDemo } from '~/lib/generation/creation-showcase-media';

const historyColumnCount = (width: number) => width >= 640 ? 4 : 2;

const SELECT_CLASS =
  'h-11 w-full min-w-0 cursor-pointer rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] px-3 text-base text-[var(--text)] lg:h-10 lg:text-[13px] outline-none hover:bg-[var(--ctl-hover)] focus:border-[var(--amber)]';

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
  provider: string;
  initialQuery?: {
    template?: string;
    templateId?: string;
    id?: string;
    demo?: string;
    mode?: string;
  };
};

type SwipeViewerState = {
  images: string[];
  initialIndex: number;
  title: string;
  imageKeyPrefix: string;
  showDownload: boolean;
};
type UiState = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';
type ReferenceImageUpload = {
  id: number;
  name: string;
  preview: string;
  url: string | null;
  status: 'selected' | 'uploading' | 'ready' | 'failed';
};
type CreateHeroBlock = {
  /** Full headline for reference / accessibility */
  title: string;
  titleLine1: string;
  titleLine2Before: string;
  titleLine2Em: string;
  titleLine2After: string;
  subtitle: string;
  featuresTitle: string;
  features: { t: string; d: string }[];
  howTitle: string;
  howSteps: string[];
  whyTitle: string;
  whyPoints: string[];
  sayTitle: string;
  says: { q: string; a: string }[];
  faqTitle: string;
  faqs: { q: string; a: string }[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
};
type InternalConfigCopy = { title: string; body: string; steps: string[] };

export default function PageComponent({ locale, prompts, provider, initialQuery = {} }: Props) {
  const t = useTranslations('OpenPrompts');
  const [selectedId, setSelectedId] = useState<string>('');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [resultTab, setResultTab] = useState<'current' | 'history'>('current');
  const [mobileCtaVisible, setMobileCtaVisible] = useState(true);
  const createControlsRef = useRef<HTMLElement | null>(null);
  const createInspirationRef = useRef<HTMLElement | null>(null);
  const item = useMemo(() => {
    return prompts.find((p) => p.id === selectedId);
  }, [selectedId, prompts]);

  useEffect(() => {
    const idFromUrl = initialQuery.template || initialQuery.templateId || initialQuery.id;
    if (!idFromUrl) return;
    const exists = prompts.some((p) => p.id === idFromUrl);
    if (!exists) return;
    setSelectedId(idFromUrl);
    const el = document.getElementById('op-create-prompt');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [initialQuery.id, initialQuery.template, initialQuery.templateId, prompts]);

  const siteDemo = selectedId === initialQuery.template
    ? resolveCreationSiteDemo(selectedId, initialQuery.demo, parseCreateImageMode(initialQuery.mode))
    : undefined;

  const { status: authStatus } = useSession();
  const [billingOpen, setBillingOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [resolution, setResolution] = useState<ImageResolution>('1k');
  useEffect(() => {
    if (!pickAtlasSize(aspectRatio, resolution)) setResolution('1k');
  }, [aspectRatio, resolution]);
  const [aspectTouched, setAspectTouched] = useState(false);
  const [model, setModel] = useState<string>('GPT Image 2.6 Sunburst');
  const [imageMode, setImageMode] = useState<CreateImageMode>('text');
  useEffect(() => {
    const modeFromUrl = parseCreateImageMode(initialQuery.mode);
    if (modeFromUrl) setImageMode(modeFromUrl);
  }, [initialQuery.mode]);
  const imagePath = imageMode === 'edit' ? 'edit' : imageMode === 'reference' ? 'reference' : 'text-to-image';
  const [unavailableInspirationIds, setUnavailableInspirationIds] = useState<string[]>([]);
  const [inspirationAspectRatios, setInspirationAspectRatios] = useState<Record<string, number>>({});
  const inspirationItems = useMemo(() => pickCreationTypeInspiration(prompts, imageMode).filter((p) => !unavailableInspirationIds.includes(p.id)), [prompts, imageMode, unavailableInspirationIds]);
  const creationType = CREATION_TYPES.find((type) => type.mode === imageMode)!;
  const [referenceItems, setReferenceItems] = useState<ReferenceImageUpload[]>([]);
  const [referenceSelectionErrors, setReferenceSelectionErrors] = useState<string[]>([]);
  const [draggingReference, setDraggingReference] = useState(false);
  const referenceIdRef = useRef(0);
  const referenceResourcesRef = useRef(new Map<number, { file: File; preview: string; controller: AbortController }>());
  const uploadingImages = referenceItems.some((image) => image.status === 'uploading');
  useEffect(() => () => {
    referenceResourcesRef.current.forEach(({ preview, controller }) => {
      controller.abort();
      URL.revokeObjectURL(preview);
    });
    referenceResourcesRef.current.clear();
  }, []);
  const [quality, setQuality] = useState<string>('1k');
  const [count, setCount] = useState<number>(1);

  const capabilities = useMemo(() => {
    const all = Object.values(PROVIDER_CAPABILITIES);
    const aspectRatios = Array.from(new Set(all.flatMap((c: any) => c.aspectRatios || [])));
    const qualities = Array.from(new Set(all.flatMap((c: any) => c.qualities || [])));
    const maxCount = Math.max(1, ...all.map((c: any) => Number(c.maxCount || 1)));
    return { aspectRatios, qualities, maxCount } as (typeof PROVIDER_CAPABILITIES)[keyof typeof PROVIDER_CAPABILITIES];
  }, []);

  const modelOptions = useMemo(() => {
    const base = PROVIDER_CAPABILITIES.internal?.models;
    const opts =
      Array.isArray(base) && base.length
        ? base
        : [{ label: item?.model ?? 'GPT Image 2', value: item?.model ?? 'GPT Image 2' }];
    // If template has a specific model, make sure it remains selectable.
    const templateLabel = String(item?.model || '').trim();
    if (templateLabel) {
      const key = templateLabel;
      const exists = opts.some((m) => String(m.value ?? m.label) === key);
      if (!exists) return [{ label: templateLabel, value: templateLabel }, ...opts];
    }
    return opts;
  }, [item?.model]);

  useEffect(() => {
    // Keep selected model valid when template changes.
    const values = modelOptions.map((o) => String(o.value ?? o.label)).filter((value) => !isModelComingSoon(value));
    const preferred = String(siteDemo?.model || item?.model || '').trim();
    const next =
      (preferred && values.includes(preferred) ? preferred : '') ||
      (model && values.includes(model) ? model : '') ||
      (values[0] || '');
    setModel((prev) => (prev === next ? prev : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, item?.model, modelOptions, siteDemo]);

  const pickClosestAspect = (w: number, h: number, options: string[]) => {
    const ratio = w > 0 && h > 0 ? w / h : 1;
    const parse = (s: string) => {
      const [a, b] = String(s).split(':').map((x) => Number(x));
      if (!a || !b) return 1;
      return a / b;
    };
    let best = options[0] || '1:1';
    let bestScore = Number.POSITIVE_INFINITY;
    for (const opt of options) {
      const r = parse(opt);
      // Use log distance so 1/2 and 2/1 are symmetric.
      const score = Math.abs(Math.log(ratio / r));
      if (score < bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best;
  };

  useEffect(() => {
    // When template changes, auto-pick aspect ratio from the first image (unless user manually changed it).
    setAspectTouched(false);
  }, [selectedId]);

  useEffect(() => {
    if (aspectTouched || siteDemo) return;
    const src = item?.images?.[0];
    if (!src) return;

    let cancelled = false;
    const img = new (globalThis as any).Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.onload = () => {
      if (cancelled) return;
      const w = Number(img.naturalWidth || 0);
      const h = Number(img.naturalHeight || 0);
      if (!w || !h) return;
      const next = pickClosestAspect(w, h, capabilities.aspectRatios);
      setAspectRatio((prev) => (prev === next ? prev : next));
    };
    img.onerror = () => {
      // ignore
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.images, capabilities.aspectRatios, aspectTouched, siteDemo]);

  const [uiState, setUiState] = useState<UiState>('idle');
  const generationInFlightRef = useRef(false);
  const [providerJobId, setProviderJobId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [ratioByUrl, setRatioByUrl] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const historyStoreRef = useRef<ReturnType<typeof createHistoryStore> | null>(null);
  const lastSavedJobRef = useRef<string | null>(null);
  const submittedSettingsRef = useRef<Pick<HistoryEntry, 'prompt' | 'model' | 'aspectRatio' | 'resolution' | 'quality' | 'count'> | null>(null);
  const [swipeViewer, setSwipeViewer] = useState<SwipeViewerState | null>(null);
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const historyImageCacheRef = useRef<ReturnType<typeof createHistoryImageCache> | null>(null);
  const historyImageSources = useMemo(() => new Set([...history.flatMap(entry => entry.images), ...images, ...(swipeViewer && (swipeViewer.imageKeyPrefix === 'output' || swipeViewer.imageKeyPrefix.startsWith('hist-')) ? swipeViewer.images : [])].filter(isHistoryImageSource)), [history, images, swipeViewer]);
  generationInFlightRef.current = uiState === 'queued' || uiState === 'running';

  const imageTransport = (source: string) => /^https?:\/\//i.test(source)
    ? `${localeApiPath(locale, '/api/image-proxy')}?url=${encodeURIComponent(source)}`
    : source;
  const resolveImage = (source: string) => cachedImages[source]
    ?? (historyImageSources.has(source) ? HISTORY_IMAGE_PLACEHOLDER : imageTransport(source));

  const openViewer = (
    list: string[],
    idx: number,
    opts?: { title?: string; prefix?: string; showDownload?: boolean }
  ) => {
    const originals = list.filter(Boolean);
    if (!originals.length) return;
    const maxIdx = originals.length - 1;
    setSwipeViewer({
      images: originals,
      initialIndex: Math.max(0, Math.min(idx, maxIdx)),
      title: opts?.title ?? '',
      imageKeyPrefix: opts?.prefix ?? 'output',
      showDownload: opts?.showDownload ?? true,
    });
  };

  useEffect(() => {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch {}
    const store = createHistoryStore(storage, (update) => navigator.locks.request(HISTORY_STORAGE_KEY, update));
    historyStoreRef.current = store;
    const cache = createHistoryImageCache(store.imageSources, imageTransport, setCachedImages);
    historyImageCacheRef.current = cache;
    setHistory(store.read());
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === storage && (event.key === HISTORY_STORAGE_KEY || event.key === null)) setHistory(store.read());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      cache.dispose();
      historyImageCacheRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    historyImageCacheRef.current?.sync(Array.from(historyImageSources));
  }, [historyImageSources, locale]);

  useEffect(() => {
    const controls = createControlsRef.current;
    const inspiration = createInspirationRef.current;
    if (!controls || typeof IntersectionObserver === 'undefined') return;
    let controlsVisible = false;
    let inspirationVisible = false;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === controls) controlsVisible = entry.isIntersecting;
        if (entry.target === inspiration) inspirationVisible = entry.isIntersecting;
      }
      setMobileCtaVisible(controlsVisible && !inspirationVisible);
    });
    observer.observe(controls);
    if (inspiration) observer.observe(inspiration);
    return () => observer.disconnect();
  }, [inspirationItems.length, resultTab]);

  useEffect(() => {
    // reset when switching prompt
    if (generationInFlightRef.current) return;
    if (item) setPromptText(siteDemo?.prompt ?? item.prompt);
    setError(null);
    setUiState('idle');
    setProviderJobId(null);
    setGenerationId(null);
    setImages([]);
  }, [selectedId, item?.prompt, siteDemo]);

  useEffect(() => {
    if (uiState !== 'succeeded') return;
    if (!images.length) return;
    const jobKey = providerJobId ?? '__no_job__';
    if (lastSavedJobRef.current === jobKey) return;
    lastSavedJobRef.current = jobKey;

    const entry: HistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: Date.now(),
      providerJobId,
      ...submittedSettingsRef.current!,
      provider: 'internal',
      images,
    };

    const store = historyStoreRef.current!;
    void store.add(entry).then(() => setHistory(store.read()));
  }, [uiState, images, providerJobId]);

  useEffect(() => {
    if (!providerJobId) return;
    if (uiState !== 'queued' && uiState !== 'running') return;

    let cancelled = false;
    const tick = async () => {
      try {
        const statusPath = localeApiPath(locale, `/api/generations/${encodeURIComponent(providerJobId)}`);
        const statusUrl = generationId
          ? `${statusPath}?generationId=${encodeURIComponent(generationId)}`
          : statusPath;
        const res = await fetch(statusUrl, { cache: 'no-store' }).then((r) => r.json());
        if (cancelled) return;
        if (res?.status === 'running' || res?.status === 'queued') {
          setUiState(res.status);
          return;
        }
        if (res?.status === 'succeeded') {
          setUiState('succeeded');
          setImages(Array.isArray(res.images) ? res.images : []);
          notifyCreditsChanged();
          return;
        }
        setUiState('failed');
        notifyCreditsChanged();
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
  }, [generationId, locale, providerJobId, uiState, t]);

  const maxReferenceImages = referenceImageLimit(model || item?.model || 'GPT Image 2');
  const promptValidationError =
    !promptText.trim()
      ? t('gen.missingPrompt')
      : imageMode !== 'text' && !referenceItems.length
        ? t('gen.referenceImage')
        : imageMode !== 'text' && maxReferenceImages !== null && referenceItems.length > maxReferenceImages
          ? t('gen.referenceLimit', { max: maxReferenceImages })
          : null;
  const canGenerate =
    !promptValidationError &&
    (imageMode === 'text' || !uploadingImages) &&
    (uiState === 'idle' || uiState === 'failed' || uiState === 'succeeded');
  const generationInFlight = uiState === 'queued' || uiState === 'running';

  const hero = useMemo(() => t.raw('createPage.hero' as any) as CreateHeroBlock, [t]);

  const createSize = pickAtlasSize(aspectRatio, provider === 'atlascloud' ? resolution : undefined);
  const buttonCredits = generateButtonCredits({
    byok: false,
    model: model || item?.model || 'GPT Image 2',
    path: imagePath,
    quality,
    width: createSize?.width,
    height: createSize?.height,
    count,
  });
  const generateLabel = generationInFlight
    ? t('gen.generating')
    : `${t('gen.generate')} · ${buttonCredits == null ? t('gen.unpricedLabel') : t('pricingPage.credits', { count: buttonCredits })}`;

  const onReferenceFile = (file: File) => {
    const invalid = uploadFileError(file);
    if (invalid) {
      setReferenceSelectionErrors((errors) => [...errors, `${file.name}: ${t(invalid === 'type' ? 'gen.uploadType' : 'gen.uploadSize')}`]);
      return;
    }
    if (maxReferenceImages !== null && referenceResourcesRef.current.size >= maxReferenceImages) {
      const message = t('gen.referenceLimit', { max: maxReferenceImages });
      setReferenceSelectionErrors((errors) => errors.includes(message) ? errors : [...errors, message]);
      return;
    }
    const id = ++referenceIdRef.current;
    const preview = URL.createObjectURL(file);
    const controller = new AbortController();
    referenceResourcesRef.current.set(id, { file, preview, controller });
    setReferenceItems((items) => [...items, { id, name: file.name, preview, url: null, status: 'selected' }]);
    return id;
  };

  const onReferenceFiles = (files: File[]) => {
    if (generationInFlight || !files.length) return;
    setReferenceSelectionErrors([]);
    files.forEach(onReferenceFile);
  };

  const removeReferenceImage = (id: number) => {
    const resource = referenceResourcesRef.current.get(id);
    if (!resource) return;
    referenceResourcesRef.current.delete(id);
    resource.controller.abort();
    URL.revokeObjectURL(resource.preview);
    setReferenceItems((items) => items.filter((image) => image.id !== id));
    setSwipeViewer(viewer => viewer?.imageKeyPrefix === 'references' ? null : viewer);
  };

  useEffect(() => {
    if (!siteDemo || imageMode !== 'reference' || generationInFlightRef.current) return;
    setModel(siteDemo.model);
    setAspectRatio(siteDemo.aspectRatio);
    setResolution(siteDemo.resolution);
    setQuality(siteDemo.quality);
    setCount(siteDemo.count);
    const controller = new AbortController();
    let referenceId: number | undefined;
    const src = siteDemo.inputs[0].src;
    void fetch(src, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(t('gen.uploadFailed'));
        return response.blob();
      })
      .then(blob => {
        if (!controller.signal.aborted) referenceId = onReferenceFile(new File([blob], src.split('/').pop()!, { type: blob.type }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setReferenceSelectionErrors([t('gen.uploadFailed')]);
      });
    return () => {
      controller.abort();
      if (referenceId !== undefined) removeReferenceImage(referenceId);
    };
  }, [siteDemo, imageMode]);

  const onGenerate = async (skipAuth = false) => {
    if (generationInFlightRef.current || (imageMode !== 'text' && uploadingImages)) return;
    const p = promptText.trim();
    if (promptValidationError) {
      setError(promptValidationError);
      return;
    }
    if (!skipAuth && authStatus !== 'authenticated') {
      setBillingOpen(true);
      return;
    }
    if (buttonCredits == null) {
      if (skipAuth || authStatus !== 'authenticated') {
        window.location.assign(localeApiPath(locale, '/pricing'));
        return;
      }
      setError(t('pricingPage.rateNote'));
      setUiState('idle');
      return;
    }
    const submittedSettings = { prompt: p, model: model || item?.model || 'GPT Image 2', aspectRatio, resolution, quality, count };
    submittedSettingsRef.current = submittedSettings;
    generationInFlightRef.current = true;
    setError(null);
    setUiState('queued');
    setProviderJobId(null);
    setGenerationId(null);
    setImages([]);
    setResultTab('current');
    requestAnimationFrame(() => {
      document.querySelector('[data-create-stage]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    try {
      const balance = await fetch('/api/billing/balance', { cache: 'no-store' }).then((response) => response.json()).catch(() => ({ balance: 0 }));
      if (shouldOpenPricing({ byok: false, credits: buttonCredits, balance: Number(balance.balance || 0) })) {
        window.location.assign(localeApiPath(locale, '/pricing'));
        return;
      }
      const submittedReferenceImages: string[] = [];
      if (imageMode !== 'text') {
        for (const image of referenceItems) {
          if (image.url) {
            submittedReferenceImages.push(image.url);
            continue;
          }
          const resource = referenceResourcesRef.current.get(image.id)!;
          setReferenceItems((items) => items.map((entry) => entry.id === image.id ? { ...entry, status: 'uploading' } : entry));
          try {
            const form = new FormData();
            form.set('file', resource.file);
            const response = await fetch(localeApiPath(locale, '/api/generations/upload'), { method: 'POST', body: form, signal: resource.controller.signal });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || typeof data.url !== 'string' || !data.url.startsWith('https://')) throw new Error(t('gen.uploadFailed'));
            if (!referenceResourcesRef.current.has(image.id)) return;
            submittedReferenceImages.push(data.url);
            setReferenceItems((items) => items.map((entry) => entry.id === image.id ? { ...entry, url: data.url, status: 'ready' } : entry));
          } catch (error) {
            if (!referenceResourcesRef.current.has(image.id)) return;
            setReferenceItems((items) => items.map((entry) => entry.id === image.id ? { ...entry, status: 'failed' } : entry));
            throw error;
          }
        }
      }
      const res = await fetch(localeApiPath(locale, '/api/generations'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-op-user-id': getOrCreateUserId() },
        body: JSON.stringify({
          ...submittedSettings,
          resolution: provider === 'atlascloud' ? submittedSettings.resolution : undefined,
          path: imagePath,
          referenceImages: submittedReferenceImages,
        }),
      }).then((r) => r.json());

      if (res?.error) throw new Error(res.error);
      setProviderJobId(res.providerJobId);
      setGenerationId(res.generationId ?? null);
      setUiState(res.status || 'queued');
      notifyCreditsChanged();
    } catch (e: any) {
      if (authStatus !== 'authenticated' && generationBillingOffer(e?.message)) {
        setUiState('idle');
        setBillingOpen(true);
        return;
      }
      setUiState('failed');
      setError(e?.message || t('gen.createFailed'));
    }
  };

  const internalConfigHint = useMemo(() => {
    const msg = String(error || '');
    if (!msg) return null;

    const looksLikeMissingKey =
      msg.includes('Missing ATLASCLOUD_BASE_URL') ||
      msg.includes('Missing ATLASCLOUD_API_KEY') ||
      msg.includes('Missing REPLICATE_API_TOKEN') ||
      msg.includes('Missing REPLICATE_MODEL') ||
      msg.includes('Missing REPLICATE_VERSION') ||
      msg.toLowerCase().includes('unknown provider');

    if (!looksLikeMissingKey) return null;

    return t.raw('createPage.internalConfig' as any) as InternalConfigCopy;
  }, [error, t]);

  const downloadWithRandomName = async (url: string) => {
    const original = String(url || '').trim();
    if (!original) return;
    const src = await historyImageCacheRef.current?.get(original) ?? imageTransport(original);

    const extFromUrl = (u: string) => {
      try {
        const parsed = new URL(u, 'http://local');
        const p = parsed.pathname || '';
        const m = p.match(/\.(png|jpg|jpeg|webp|gif)$/i);
        if (m?.[1]) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
      } catch {
        // ignore
      }
      return 'png';
    };

    const randomId =
      (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const res = await fetch(src, { cache: 'no-store' });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const blob = await res.blob();
    const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' } as Record<string, string>)[blob.type] ?? extFromUrl(original);
    const filename = `op_${randomId}.${extension}`;
    const blobUrl = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  return (
    <>
      <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
        <OpenPromptsSiteHeader
          locale={locale}
          activeNav="create"
          langPathSuffix="/create"
          stickyZClass="z-50"
        />

        <div
          data-create-workspace
          className="mx-auto w-full max-w-7xl border-[var(--border2)] lg:min-h-[calc(100svh-112px)] lg:border-x"
        >
          <div className="grid w-full grid-cols-1 lg:min-h-[calc(100svh-112px)] lg:grid-cols-[380px_minmax(0,1fr)]">
            <main
              ref={createControlsRef}
              className="relative z-10 bg-[var(--surface)] lg:border-r lg:border-[var(--border2)]"
            >
            <div className="p-3 pb-20 sm:p-4 sm:pb-20 lg:pb-4">
              <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
                {item ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openViewer(item.images, 0, {
                          title: item.title,
                          prefix: item.id,
                          showDownload: false,
                        })
                      }
                      disabled={!item.images?.length}
                      className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border2)] bg-[var(--surface)] disabled:cursor-default"
                      aria-label={t('createPage.fullscreenTitle')}
                    >
                      {item.images?.[0] ? (
                        <CoverImage
                          src={item.images[0]}
                          alt={item.title}
                          sizes="80px"
                          className="object-cover"
                          errorText={t('gallery.coverLoadFailed')}
                        />
                      ) : null}
                      {item.images.length > 1 ? (
                        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                          ▣ {item.images.length}
                        </span>
                      ) : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text3)]">
                        {t('createPage.templatesLabel')}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--text3)]">{item.model}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <button
                        type="button"
                        disabled={generationInFlight}
                        onClick={() => setTemplatePickerOpen(true)}
                        className="min-h-8 min-w-8 rounded-md px-2 text-xs text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-50 lg:min-h-0 lg:min-w-0 lg:px-0"
                      >
                        {t('createPage.changeTemplate')}
                      </button>
                      <button
                        type="button"
                        disabled={generationInFlight}
                        onClick={() => setSelectedId('')}
                        className="min-h-8 min-w-8 rounded-md px-2 text-[11px] text-[var(--text3)] hover:text-red-400 disabled:opacity-50 lg:min-h-0 lg:min-w-0 lg:px-0"
                      >
                        {t('createPage.clearTemplate')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text)]">{t('createPage.templateOptional')}</div>
                      <div className="mt-1 text-xs text-[var(--text3)]">{t('createPage.templateOptionalHint')}</div>
                    </div>
                    <button
                      type="button"
                      disabled={generationInFlight}
                      onClick={() => setTemplatePickerOpen(true)}
                      className="shrink-0 rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-50"
                    >
                      {t('createPage.chooseTemplate')}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--border2)] bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] shadow-sm">
                <div className="border-b border-[var(--border)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-medium tracking-[0.08em] text-[var(--text2)]">
                      {t('createPage.promptSectionLabel')}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="min-h-9 rounded-lg border border-[var(--border2)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text2)] hover:text-[var(--text)] lg:min-h-0 lg:text-[11px]"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(promptText);
                            setCopied(true);
                          } finally {
                            window.setTimeout(() => setCopied(false), 900);
                          }
                        }}
                      >
                        {copied ? t('modal.copied') : t('modal.copy')}
                      </button>
                      <button
                        className="rounded-lg border border-[color-mix(in_oklab,var(--amber)_35%,transparent)] bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] min-h-9 px-3 py-1.5 text-xs text-[var(--amber2)] lg:min-h-0 lg:text-[11px]"
                        onClick={() => setPromptText((x) => x.trim() + (x.includes('highly detailed') ? '' : ', highly detailed'))}
                      >
                        {t('createPage.enhanceButton')}
                      </button>
                    </div>
                  </div>

                  <textarea
                    id="op-create-prompt"
                    className="h-40 w-full resize-none rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-3 text-base leading-relaxed sm:p-4 lg:h-48 lg:text-[12.5px] text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder={t('createPage.promptPlaceholder')}
                  />

                  <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
                    <span className={promptValidationError ? 'text-red-400' : 'text-[var(--text3)]'}>
                      {promptValidationError ?? `${promptText.length}`}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <div className="grid gap-4">
                    <label className="grid gap-1.5">
                      <span className="text-[11px] font-medium text-[var(--text3)]">{t('gen.path')}</span>
                      <select
                        className={SELECT_CLASS}
                        value={imageMode}
                        onChange={(e) => setImageMode(e.target.value as CreateImageMode)}
                      >
                        <option value="text">{t('gen.textToImage')}</option>
                        <option value="reference">{t('gen.referenceToImage')}</option>
                        <option value="edit">{t('gen.imageEdit')}</option>
                      </select>
                    </label>
                    {imageMode !== 'text' ? (
                      <section className="grid min-w-0 gap-3" data-reference-images aria-labelledby="op-reference-title">
                        <div className="flex items-center justify-between gap-2">
                          <h2 id="op-reference-title" className="text-xs font-semibold text-[var(--text)]">{t('gen.referenceImage')}</h2>
                          <span className="text-xs tabular-nums text-[var(--text3)]" aria-live="polite">{maxReferenceImages === null ? referenceItems.length || '' : `${referenceItems.length}/${maxReferenceImages}`}</span>
                        </div>
                        <label
                          data-reference-dropzone
                          data-dragging={draggingReference}
                          className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-5 text-center transition-colors focus-within:border-[var(--amber)] focus-within:ring-2 focus-within:ring-[var(--amber)] ${generationInFlight ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${draggingReference ? 'border-[var(--amber)] bg-[var(--surface2)]' : 'border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--amber)] hover:bg-[var(--surface2)]'}`}
                          onDragEnter={(event) => {
                            event.preventDefault();
                            if (!generationInFlight && event.dataTransfer.types.includes('Files')) setDraggingReference(true);
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = generationInFlight || !event.dataTransfer.types.includes('Files') ? 'none' : 'copy';
                          }}
                          onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraggingReference(false);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDraggingReference(false);
                            onReferenceFiles(Array.from(event.dataTransfer.files));
                          }}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="sr-only"
                            aria-label={t('gen.uploadImage')}
                            aria-describedby="op-reference-formats"
                            disabled={generationInFlight}
                            onChange={(event) => {
                              const files = Array.from(event.target.files || []);
                              event.target.value = '';
                              onReferenceFiles(files);
                            }}
                          />
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[var(--amber)]" aria-hidden="true">
                            <path d="M12 16V4m0 0L7 9m5-5l5 5M4 16v4h16v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-sm font-medium text-[var(--text)]">{t('gen.uploadDropTitle')}</span>
                          <span className="text-xs text-[var(--text2)]">{t('gen.uploadDropHint')}</span>
                          <span id="op-reference-formats" className="text-[11px] leading-4 text-[var(--text3)]">{t('gen.uploadFormats')}</span>
                        </label>
                        {referenceSelectionErrors.length ? (
                          <div role="alert" className="grid gap-1 text-xs text-red-400">
                            {referenceSelectionErrors.map((message, index) => <p key={index} className="break-words">{message}</p>)}
                          </div>
                        ) : null}
                        {referenceItems.length ? (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                            {referenceItems.map((image, index) => (
                              <div key={image.id} data-reference-status={image.status} className="relative min-w-0 overflow-hidden rounded-xl border border-[var(--border2)] bg-[var(--surface)]">
                                <button
                                  type="button"
                                  data-reference-preview
                                  className="block aspect-[4/3] w-full bg-[var(--surface2)] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--amber)]"
                                  aria-label={t('gen.previewImage', { name: image.name })}
                                  onClick={() => openViewer(referenceItems.map((entry) => entry.preview), index, { title: t('gen.referenceImage'), prefix: 'references', showDownload: false })}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={image.preview} alt={image.name} className="h-full w-full object-contain" />
                                </button>
                                <button
                                  type="button"
                                  className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-lg bg-black/70 text-white hover:bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--amber)] disabled:opacity-50"
                                  aria-label={t('gen.removeImage', { name: image.name })}
                                  disabled={generationInFlight}
                                  onClick={() => removeReferenceImage(image.id)}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                  </svg>
                                </button>
                                <div className="grid gap-1 p-2 text-[11px]">
                                  <span className="truncate text-[var(--text2)]" title={image.name}>{image.name}</span>
                                  {image.status === 'uploading' || image.status === 'failed' ? <span role="status" className={image.status === 'failed' ? 'text-red-400' : 'text-[var(--text3)]'}>{t(image.status === 'failed' ? 'gen.uploadFailed' : 'gen.uploading')}</span> : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <p className="text-[11px] leading-4 text-[var(--text3)]">{imageMode === 'edit' ? t('gen.editHint') : t('gen.referenceHint')}</p>
                      </section>
                    ) : null}
                  </div>
                  <div className="mt-5 grid gap-4" data-create-controls>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="col-span-2 grid min-w-0 gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--text3)]">{t('createPage.modelTitle')}</span>
                        <select className={SELECT_CLASS} value={model} onChange={(e) => setModel(e.target.value)}>
                          {modelOptions.map((m) => {
                            const v = String(m.value ?? m.label);
                            return (
                              <option key={v} value={v} disabled={isModelComingSoon(v)}>
                                {modelDisplayLabel(m.label, t)}{isModelComingSoon(v) ? ` · ${t('gen.comingSoon')}` : ''}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className={`grid min-w-0 gap-1.5${provider === 'atlascloud' ? '' : ' col-span-2'}`}>
                        <span className="text-[11px] font-medium text-[var(--text3)]">{t('gen.aspectRatio')}</span>
                        <select
                          className={SELECT_CLASS}
                          value={aspectRatio}
                          onChange={(e) => {
                            setAspectTouched(true);
                            setAspectRatio(e.target.value);
                          }}
                        >
                          {capabilities.aspectRatios.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>

                      {provider === 'atlascloud' ? (
                        <>
                          <label className="grid min-w-0 gap-1.5">
                            <span className="text-[11px] font-medium text-[var(--text3)]">{t('gen.resolution')}</span>
                            <select className={SELECT_CLASS} value={resolution} onChange={(e) => setResolution(e.target.value as ImageResolution)}>
                              {IMAGE_RESOLUTIONS.map((value) => {
                                const dimensions = pickAtlasSize(aspectRatio, value);
                                return <option key={value} value={value} disabled={!dimensions}>{value.toUpperCase()}{dimensions ? ` · ${dimensions.width}×${dimensions.height}` : ''}</option>;
                              })}
                            </select>
                          </label>
                          <p className="col-span-2 text-[11px] leading-4 text-[var(--text3)]">{t('gen.resolutionExperimental')}</p>
                        </>
                      ) : null}

                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--text3)]">{t('gen.quality')}</span>
                        <select className={SELECT_CLASS} value={quality} onChange={(e) => setQuality(e.target.value)}>
                          {capabilities.qualities.map((q) => (
                            <option key={q} value={q}>
                              {qualityDisplayLabel(q, t)}
                              {q === '1k' ? t('createPage.qualityDefaultSuffix') : ''}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid min-w-0 gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--text3)]">{t('gen.count')}</span>
                        <select className={SELECT_CLASS} value={String(count)} onChange={(e) => setCount(Number(e.target.value))}>
                          {Array.from({ length: capabilities.maxCount }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <button
                      data-create-generate
                      type="button"
                      disabled={!canGenerate}
                      onClick={() => void onGenerate()}
                      className="hidden h-11 w-full rounded-xl bg-[var(--amber)] text-[13px] font-semibold text-[var(--bg)] disabled:opacity-50 lg:block"
                    >
                      {generateLabel}
                    </button>
                  </div>
                </div>
              </div>

              {uiState === 'failed' && !generationBillingOffer(error) ? (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {t('gen.failedPrefix')}
                  {error || t('gen.tryAgain')}
                  {internalConfigHint ? (
                    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] p-3 text-[12px] text-[var(--text2)]">
                      <div className="font-semibold text-[var(--text)]">{internalConfigHint.title}</div>
                      <div className="mt-1">{internalConfigHint.body}</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {internalConfigHint.steps.map((s) => (
                          <li key={s} className="whitespace-pre-wrap">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

            </div>
            </main>

            {/* Right rail */}
            <aside
              data-create-stage
              className={`relative z-20 flex scroll-mt-28 flex-col bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] lg:scroll-mt-16 ${resultTab === 'history' ? 'lg:h-0 lg:min-h-full' : 'lg:sticky lg:top-16 lg:max-h-[calc(100svh-5rem)] lg:self-start'}`}
            >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
              <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-1">
                <button
                  type="button"
                  onClick={() => setResultTab('current')}
                  className={`rounded-md px-4 py-2 text-xs lg:px-3 lg:py-1.5 ${
                    resultTab === 'current'
                      ? 'bg-[var(--surface)] font-medium text-[var(--text)]'
                      : 'text-[var(--text3)]'
                  }`}
                >
                  {t('createPage.currentLabel')}
                </button>
                <button
                  type="button"
                  onClick={() => setResultTab('history')}
                  className={`rounded-md px-4 py-2 text-xs lg:px-3 lg:py-1.5 ${
                    resultTab === 'history'
                      ? 'bg-[var(--surface)] font-medium text-[var(--text)]'
                      : 'text-[var(--text3)]'
                  }`}
                >
                  {t('createPage.historyLabel')}
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              {(() => {
                const proxify = resolveImage;

                const railCopy = {
                  currentEmpty: t('createPage.railCurrentEmpty'),
                  currentJump: t('createPage.railCurrentJump'),
                  historyEmpty: t('createPage.railHistoryEmpty'),
                  jobIdle: t('createPage.railJobIdle'),
                };

                const emptyHintCard = (body: string, showJump?: boolean) => (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border2)] bg-[var(--surface2)] p-6 text-center">
                    <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-lg text-[var(--text3)]">
                      ✦
                    </div>
                    <p className="text-[11px] leading-relaxed text-[var(--text3)]">{body}</p>
                    {showJump ? (
                      <button
                        type="button"
                        className="mt-1 py-2 text-xs font-medium text-[var(--amber)] hover:underline lg:text-[11px]"
                        onClick={() => {
                          document.getElementById('op-create-prompt')?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }}
                      >
                        {railCopy.currentJump}
                      </button>
                    ) : null}
                  </div>
                );

                return (
                  <>
                    <div className={resultTab === 'current' ? 'flex flex-1 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3' : 'hidden'}>
                      <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.08em] text-[var(--text3)]">
                        <span>{t('createPage.currentLabel')}</span>
                        {providerJobId ? (
                          <span
                            className="max-w-[min(160px,45%)] truncate font-mono text-[10px] text-[var(--text3)]"
                            title={providerJobId}
                          >
                            {providerJobId}
                          </span>
                        ) : (
                          <span className="text-[10px] font-normal normal-case tracking-normal text-[var(--text3)]">
                            {railCopy.jobIdle}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex h-[240px] min-h-0 flex-col justify-center lg:h-[280px]">
                        {uiState === 'queued' || uiState === 'running' ? (
                          <div data-create-result-grid className={`grid h-full min-h-0 auto-rows-fr gap-3 ${count > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {Array.from({ length: Math.max(1, count) }).map((_, i) => (
                              <div key={i} className="h-full w-full animate-pulse rounded-xl bg-[var(--surface2)]" />
                            ))}
                          </div>
                        ) : images.length ? (
                          <div data-create-result-grid className={`grid h-full min-h-0 auto-rows-fr gap-3 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {images.map((u, idx) => {
                              const src = proxify(u);
                              return (
                                <GenerationImageTile
                                  key={`${u}_${idx}`}
                                  src={src}
                                  alt={`${item?.title ?? ''} ${idx + 1}`}
                                  aspectRatio={ratioByUrl[src] ?? '4 / 3'}
                                  fitToCanvas
                                  indexLabel={`${idx + 1}/${images.length}`}
                                  openTitle={t('createPage.fullscreenTitle')}
                                  downloadTitle={t('createPage.downloadTitle')}
                                  onOpen={() => openViewer(images, idx)}
                                  onDownload={() => {
                                    void downloadWithRandomName(u);
                                  }}
                                  onMeta={({ width, height }) => {
                                    const ar = `${width} / ${height}`;
                                    setRatioByUrl((prev) => (prev[src] === ar ? prev : { ...prev, [src]: ar }));
                                  }}
                                />
                              );
                            })}
                          </div>
                        ) : uiState === 'failed' ? (
                          emptyHintCard(t('gen.tryAgain'), true)
                        ) : (
                          emptyHintCard(railCopy.currentEmpty, true)
                        )}
                      </div>
                    </div>

                    <div className={resultTab === 'history' ? 'flex flex-1 flex-col' : 'hidden'}>
                      <div className="mb-2 text-[10px] font-medium tracking-[0.08em] text-[var(--text3)]">
                        {t('createPage.historyLabel')}
                      </div>
                      {history.length ? (
                        <div data-history-grid className="w-full min-w-0">
                          <PromptGalleryMasonry
                            items={history}
                            itemKey={(h) => h.id}
                            columnCount={historyColumnCount}
                            bootstrap={false}
                            renderItem={(h) => (
                            <article data-history-card className="group flex w-full min-w-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border2)]">
                              {h.images.length ? (
                                <button
                                  type="button"
                                  className="relative block w-full shrink-0 bg-[var(--surface2)]"
                                  aria-label={t('createPage.fullscreenTitle')}
                                  onClick={() => openViewer(h.images, 0, { prefix: `hist-${h.id}` })}
                                >
                                  <CoverImage src={proxify(h.images[0])} alt={h.prompt} sizes="(min-width: 1024px) 18vw, 50vw" naturalAspectRatio={(h.aspectRatio || '3:2').replace(':', ' / ')} className="object-contain" />
                                  {h.images.length > 1 ? <span className="absolute bottom-2 right-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] text-white">1/{h.images.length}</span> : null}
                                </button>
                              ) : <div className="w-full shrink-0 bg-[var(--surface2)]" style={{ aspectRatio: (h.aspectRatio || '3:2').replace(':', ' / ') }} />}
                              <div className="h-[58px] shrink-0 px-2 py-1.5">
                                <p className="truncate text-[11px] leading-[14px] text-[var(--text2)]" title={h.prompt}>{h.prompt}</p>
                                <div className="mt-0.5 truncate text-[10px] leading-3 text-[var(--text3)]" title={modelDisplayLabel(h.model, t)}>{modelDisplayLabel(h.model, t)}</div>
                                <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] leading-3 text-[var(--text3)]">
                                  <span className="truncate" title={`${h.aspectRatio} · ${h.resolution.toUpperCase()} · ${qualityDisplayLabel(h.quality, t)} · ×${h.count}`}>{h.aspectRatio} · {h.resolution.toUpperCase()} · {qualityDisplayLabel(h.quality, t)} · ×{h.count}</span>
                                  <time dateTime={new Date(h.createdAt).toISOString()} title={new Date(h.createdAt).toLocaleString(locale)} className="shrink-0">{new Date(h.createdAt).toLocaleDateString(locale, { month: 'numeric', day: 'numeric' })}</time>
                                </div>
                              </div>
                              <div className="mt-auto flex shrink-0 items-center border-t border-[var(--border)] px-1 text-[10px]">
                                <button
                                  type="button"
                                  disabled={generationInFlight}
                                  className="h-11 min-w-0 flex-1 truncate px-1 font-medium text-[var(--amber)] disabled:opacity-50 lg:h-8"
                                  onClick={() => {
                                    lastSavedJobRef.current = h.providerJobId ?? '__no_job__';
                                    setAspectTouched(true);
                                    setAspectRatio(h.aspectRatio);
                                    setResolution(h.resolution);
                                    setQuality(h.quality);
                                    setCount(h.count);
                                    setModel(h.model);
                                    setPromptText(h.prompt);
                                    setImages(h.images);
                                    setGenerationId(null);
                                    setProviderJobId(h.providerJobId);
                                    setUiState(h.images.length ? 'succeeded' : 'idle');
                                    setResultTab('current');
                                  }}
                                >{t('createPage.reuseTitle')}</button>
                                <button type="button" disabled={!h.images.length} className="h-11 min-w-0 flex-1 truncate px-1 text-[var(--text2)] disabled:opacity-50 lg:h-8" onClick={() => void downloadWithRandomName(h.images[0])}>{t('createPage.downloadTitle')}</button>
                                <button type="button" className="h-11 min-w-0 flex-1 truncate px-1 text-[var(--text3)] hover:text-red-400 lg:h-8" onClick={() => {
                                  const store = historyStoreRef.current!;
                                  void store.remove(h.id).then(() => setHistory(store.read()));
                                }}>{t('createPage.deleteTitle')}</button>
                              </div>
                            </article>
                          )}
                          />
                        </div>
                      ) : (
                        emptyHintCard(railCopy.historyEmpty, true)
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            {resultTab === 'current' && inspirationItems.length ? (
              <section ref={createInspirationRef} data-create-inspiration data-mode={imageMode} className="shrink-0 border-t border-[var(--border)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text)]">
                      {t('createPage.popularTitle')}
                    </h2>
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--text2)]">
                      {t(`gen.${creationType.key}`)}
                    </span>
                  </div>
                  <a href={creationTypeHref(locale, creationType.slug)} className="shrink-0 py-1 text-xs text-[var(--amber)] hover:underline">
                    {t('createPage.allTemplatesLink')}
                  </a>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text3)]">{t('createPage.popularSubtitle')}</p>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [--inspiration-height:180px] lg:[--inspiration-height:220px]">
                  {inspirationItems.map((p) => (
                    <button
                      key={p.id}
                      data-inspiration-template={p.id}
                      type="button"
                      title={p.title}
                      disabled={generationInFlight}
                      onClick={() => {
                        const demo = resolveCreationSiteDemo(p.id, 'site', imageMode);
                        window.history.replaceState(null, '', createWithModeHref(locale, imageMode, p.id, demo ? 'site' : undefined));
                        setSelectedId(p.id);
                        setPromptText(p.prompt);
                        document.getElementById('op-create-prompt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="min-w-0 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--amber)] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ width: `calc(var(--inspiration-height) * ${inspirationAspectRatios[p.id] ?? 1} + 2px)` }}
                    >
                      <div className="h-[var(--inspiration-height)] bg-[var(--surface2)]">
                        <CoverImage
                          src={galleryCoverUrl(p.images[0])!}
                          alt={p.title}
                          sizes="(max-width: 1024px) 50vw, 440px"
                          className="object-contain"
                          errorText={t('gallery.coverLoadFailed')}
                          onMeta={({ width, height }) => {
                            const ratio = width / height;
                            setInspirationAspectRatios((prev) => prev[p.id] === ratio ? prev : { ...prev, [p.id]: ratio });
                          }}
                          onError={() => setUnavailableInspirationIds((ids) => ids.includes(p.id) ? ids : [...ids, p.id])}
                        />
                      </div>
                      <div className="truncate p-2 text-[11px] font-medium text-[var(--text)]">{p.title}</div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            </aside>
          </div>
        </div>

        <div
          data-mobile-generate
          className={`${
            mobileCtaVisible ? 'fixed' : 'hidden'
          } inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-xl border border-[var(--border2)] bg-[var(--panel-bg)] p-2 shadow-lg lg:hidden`}
        >
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void onGenerate()}
            className="h-11 w-full rounded-lg bg-[var(--amber)] px-5 text-sm font-semibold text-[var(--bg)] disabled:opacity-50"
          >
            {generateLabel}
          </button>
        </div>

        {/* Create workspace end */}
        <section data-create-marketing className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">

          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{hero.howTitle}</h2>
              <ol className="mt-5 space-y-4">
                {hero.howSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-[var(--text2)]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[var(--border2)] text-xs text-[var(--text)]">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{hero.featuresTitle}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {hero.features.map((feature) => (
                  <div key={feature.t}>
                    <h3 className="text-sm font-semibold text-[var(--text)]">{feature.t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--text2)]">{feature.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">{hero.faqTitle}</h2>
            <div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {hero.faqs.map((faq) => (
                <details key={faq.q} className="group py-2 sm:py-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--text)] sm:min-h-0">
                    {faq.q}
                    <span className="text-[var(--text3)] transition group-open:rotate-90">›</span>
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--text2)]">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <OpenPromptsSiteFooter locale={locale} spacing="flush" />
      </div>

      <CreateTemplatePicker
        open={templatePickerOpen}
        prompts={prompts}
        selectedId={selectedId}
        disabled={generationInFlight}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={(nextPrompt) => {
          if (generationInFlight) return;
          if (promptText !== (item?.prompt ?? '') && !window.confirm(t('createPage.carouselApplyTitle'))) return;
          setSelectedId(nextPrompt.id);
          setTemplatePickerOpen(false);
        }}
      />

      {swipeViewer ? (
        <PromptGallerySwipeViewer
          open
          onClose={() => setSwipeViewer(null)}
          images={swipeViewer.images.map(resolveImage)}
          title={swipeViewer.title}
          imageKeyPrefix={swipeViewer.imageKeyPrefix}
          initialIndex={swipeViewer.initialIndex}
          coverLoadFailedText={t('gallery.coverLoadFailed')}
          showDownloadButton={swipeViewer.showDownload}
          downloadTitle={t('createPage.downloadTitle')}
          onDownload={index => { void downloadWithRandomName(swipeViewer.images[index]); }}
          closeLabel={t('createPage.viewerClose')}
          prevLabel={t('createPage.viewerPrev')}
          nextLabel={t('createPage.viewerNext')}
          overlayClassName="bg-black/80 !z-[80]"
        />
      ) : null}

      <GenerationBillingPrompt
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        onLogin={() => void signIn('google', { callbackUrl: window.location.href })}
        onGuest={() => {
          setBillingOpen(false);
          void onGenerate(true);
        }}
        copy={{
          title: t('pricingPage.dialogTitle'),
          body: t('pricingPage.dialogBody'),
          login: t('pricingPage.dialogLogin'),
          guest: t('pricingPage.dialogGuest'),
          close: t('pricingPage.dialogClose'),
        }}
      />

    </>
  );
}

