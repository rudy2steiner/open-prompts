'use client';

import './submit-page.css';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  modelLabelToId,
  type PromptVisibility,
  type TemplateRecord,
} from '~/lib/prompts/template-types';
import { parseSubmitEditId, submitEditorHref } from '~/lib/prompts/submit-editor-path';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { localeApiPath } from '~/lib/locale-api-path';
import { parseXStatusUrl } from '~/lib/x-import/parse-x-status-url';
import { SubmitPreviewImageStrip } from './SubmitPreviewImageStrip';

const CATEGORY_KEYS = [
  'landscape',
  'portrait',
  'architecture',
  'animal',
  'illustration',
  'realism',
  'game',
  'cinematic',
  'scifi',
  'abstract',
] as const;

const MAX_RESULT_IMAGES = 4;

function isValidImageSrc(value: string): boolean {
  const v = value.trim();
  return /^https?:\/\//i.test(v) || v.startsWith('data:');
}

const MODEL_IDS = ['gptImage2', 'midjourney', 'dalle3', 'flux', 'sd', 'ideogram'] as const;
const MODEL_EMOJI: Record<(typeof MODEL_IDS)[number], string> = {
  gptImage2: '🤖',
  midjourney: '🎨',
  dalle3: '✦',
  flux: '⚡',
  sd: '🌊',
  ideogram: '💎',
};

export type SubmitPageProps = {
  locale: string;
  quickTags: string[];
};

function accountHref(locale: string) {
  return locale === 'en' ? '/account?panel=prompts' : `/${locale}/account?panel=prompts`;
}

function loginHref(locale: string, returnPath: string) {
  const base = locale === 'en' ? '/login' : `/${locale}/login`;
  return `${base}?callbackUrl=${encodeURIComponent(returnPath)}`;
}

export default function PageComponent({ locale, quickTags }: SubmitPageProps) {
  const t = useTranslations('OpenPrompts.submitPage');
  const tGallery = useTranslations('OpenPrompts.gallery');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: authStatus } = useSession();
  const galleryHref = locale === 'en' ? '/' : `/${locale}`;
  const submitPrivatePath = submitEditorHref(locale, { visibility: 'private' });

  const editId = parseSubmitEditId(searchParams?.get('edit'));
  const isEditMode = editId !== null;
  const isPrivateMode = !isEditMode && searchParams?.get('visibility') === 'private';

  const [templateVisibility, setTemplateVisibility] = useState<PromptVisibility>('public');
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const saveVisibility: PromptVisibility = isEditMode
    ? templateVisibility
    : isPrivateMode
      ? 'private'
      : 'public';

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [modelId, setModelId] = useState<(typeof MODEL_IDS)[number]>('dalle3');
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>(['Cinematic', 'Portrait']);
  const [tagInput, setTagInput] = useState('');
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [uploadDrag, setUploadDrag] = useState(false);
  const [xImportUrl, setXImportUrl] = useState('');
  const [xImportBusy, setXImportBusy] = useState(false);
  const [xImportError, setXImportError] = useState<string | null>(null);
  const [xImportOk, setXImportOk] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [blockedHint, setBlockedHint] = useState<string | null>(null);

  useEffect(() => {
    if (!shakeId) return;
    const tmr = window.setTimeout(() => setShakeId(null), 1400);
    return () => window.clearTimeout(tmr);
  }, [shakeId]);

  useEffect(() => {
    setBlockedHint(null);
  }, [title, desc, prompt, category, tags]);

  const authReturnPath =
    isEditMode && editId
      ? submitEditorHref(locale, { editId })
      : isPrivateMode
        ? submitPrivatePath
        : '';

  useEffect(() => {
    if ((!isPrivateMode && !isEditMode) || authStatus !== 'unauthenticated') return;
    router.replace(loginHref(locale, authReturnPath));
  }, [isPrivateMode, isEditMode, authStatus, locale, router, authReturnPath]);

  const applyTemplateToForm = useCallback((item: TemplateRecord) => {
    const cat =
      item.tags.find((tag) => (CATEGORY_KEYS as readonly string[]).includes(tag as (typeof CATEGORY_KEYS)[number])) ??
      '';
    setTitle(item.title);
    setDesc(item.description);
    setPrompt(item.prompt);
    setModelId(modelLabelToId(item.model) as (typeof MODEL_IDS)[number]);
    setCategory(cat);
    setTags(item.tags.filter((tag) => tag !== cat));
    setResultImages(item.images.filter(isValidImageSrc).slice(0, MAX_RESULT_IMAGES));
    setXImportUrl(item.sourceUrl ?? '');
    setTemplateVisibility(item.visibility);
    setSubmissionId(String(item.id));
  }, []);

  const loadEditTemplate = useCallback(async () => {
    if (!editId) return;
    setLoadingTemplate(true);
    setLoadError(null);
    try {
      const res = await fetch(localeApiPath(locale, `/api/my/templates/${editId}`), { cache: 'no-store' });
      const data = (await res.json().catch(() => ({}))) as { item?: TemplateRecord; error?: string };
      if (!res.ok || !data.item) {
        setLoadError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      applyTemplateToForm(data.item);
    } catch {
      setLoadError(t('editMode.loadFailed'));
    } finally {
      setLoadingTemplate(false);
    }
  }, [applyTemplateToForm, editId, locale, t]);

  useEffect(() => {
    if (!isEditMode || authStatus !== 'authenticated') return;
    void loadEditTemplate();
  }, [isEditMode, authStatus, loadEditTemplate]);

  const shake = useCallback((id: string) => {
    setShakeId(id);
  }, []);

  const focusField = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      window.setTimeout(() => el.focus(), 200);
    }
  }, []);

  const promptLenOk = prompt.trim().length >= 10;
  const titleOk = title.trim().length > 0;
  const modelOk = !!modelId;
  const categoryOk = Boolean(category);
  const tagsOk = tags.length >= 2 && tags.length <= 8;

  const previewImageUrls = useMemo(() => resultImages.slice(0, MAX_RESULT_IMAGES), [resultImages]);
  const imagesFull = resultImages.length >= MAX_RESULT_IMAGES;

  const validateForm = () => {
    if (!title.trim()) {
      setBlockedHint(t('validation.needTitle'));
      focusField('f-title');
      shake('f-title');
      return false;
    }
    if (!prompt.trim() || prompt.trim().length < 10) {
      setBlockedHint(t('validation.needPrompt'));
      focusField('f-prompt');
      shake('f-prompt');
      return false;
    }
    if (!category) {
      setBlockedHint(t('validation.needCategory'));
      focusField('f-category');
      shake('f-category');
      return false;
    }
    if (tags.length < 2 || tags.length > 8) {
      setBlockedHint(t('validation.needTags'));
      document.getElementById('op-tag-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => document.getElementById('tag-input')?.focus(), 200);
      shake('tag-wrap');
      return false;
    }
    return true;
  };

  const addTag = (raw: string) => {
    const val = raw.replace(',', '').trim();
    if (!val || tags.includes(val) || tags.length >= 8) return;
    setTags((prev) => [...prev, val]);
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((x) => x !== tag));

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    addTag(tagInput);
    setTagInput('');
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    void (async () => {
      const incoming = Array.from(files);
      const dataUrls: string[] = [];
      for (const file of incoming) {
        if (dataUrls.length >= MAX_RESULT_IMAGES) break;
        try {
          // eslint-disable-next-line no-await-in-loop
          dataUrls.push(await readFileAsDataUrl(file));
        } catch {
          break;
        }
      }
      if (dataUrls.length === 0) return;
      setResultImages((cur) => {
        const room = MAX_RESULT_IMAGES - cur.length;
        if (room <= 0) return cur;
        return [...cur, ...dataUrls.slice(0, room)];
      });
    })();
    setUploadDrag(false);
  };

  const removeImage = (index: number) => {
    setResultImages((prev) => prev.filter((_, idx) => idx !== index));
    setUrlError(null);
  };

  const addImageUrl = useCallback(() => {
    const raw = urlDraft.trim();
    if (!raw) return;
    if (imagesFull) {
      setUrlError(t('validation.imageLimit'));
      return;
    }
    if (!isValidImageSrc(raw)) {
      setUrlError(t('validation.invalidImageUrl'));
      return;
    }
    if (resultImages.includes(raw)) {
      setUrlError(t('validation.duplicateImageUrl'));
      return;
    }
    setResultImages((prev) => [...prev, raw].slice(0, MAX_RESULT_IMAGES));
    setUrlDraft('');
    setUrlError(null);
  }, [imagesFull, resultImages, t, urlDraft]);

  const onUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addImageUrl();
  };

  const runXImport = useCallback(async () => {
    setXImportError(null);
    setXImportOk(false);
    const u = xImportUrl.trim();
    if (!u) return;
    if (!parseXStatusUrl(u)) {
      setXImportError(t('xImport.errorNotTweet'));
      return;
    }
    setXImportBusy(true);
    try {
      const res = await fetch(localeApiPath(locale, '/api/x-import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        title?: string;
        description?: string;
        prompt?: string;
        imageUrls?: string[];
      };
      if (!res.ok) {
        setXImportError(data.error || t('xImport.errorGeneric'));
        return;
      }
      if (typeof data.title === 'string') setTitle(data.title.slice(0, 60));
      if (typeof data.description === 'string') setDesc(data.description.slice(0, 120));
      if (typeof data.prompt === 'string') setPrompt(data.prompt);
      if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
        const imported = data.imageUrls.filter(isValidImageSrc).slice(0, MAX_RESULT_IMAGES);
        if (imported.length > 0) setResultImages(imported);
      }
      setXImportOk(true);
    } catch {
      setXImportError(t('xImport.errorGeneric'));
    } finally {
      setXImportBusy(false);
    }
  }, [locale, t, xImportUrl]);

  const copyPrompt = () => {
    if (!prompt) return;
    void navigator.clipboard.writeText(prompt).then(() => {
      const btn = document.getElementById('op-sp-copy-btn');
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = t('buttons.copied');
        window.setTimeout(() => {
          btn.textContent = prev || t('buttons.copyPrompt');
        }, 1500);
      }
    });
  };

  const doSubmit = async () => {
    if (!validateForm()) return;
    setBlockedHint(null);
    setSubmitting(true);
    const payload = {
      title: title.trim(),
      description: desc.trim(),
      prompt: prompt.trim(),
      modelId,
      category,
      tags,
      images: previewImageUrls,
      sourceUrl: xImportUrl.trim() || undefined,
      visibility: saveVisibility,
    };
    try {
      const res = await fetch(
        isEditMode && editId
          ? localeApiPath(locale, `/api/my/templates/${editId}`)
          : localeApiPath(locale, '/api/prompts'),
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: number;
        item?: TemplateRecord;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401 && (isPrivateMode || isEditMode)) {
          router.replace(loginHref(locale, authReturnPath));
          return;
        }
        if (res.status === 503) {
          setBlockedHint(t('validation.submitUnavailable'));
        } else {
          setBlockedHint(typeof data.error === 'string' ? data.error : t('validation.submitFailed'));
        }
        return;
      }
      setSuccess(true);
      const id = data.item?.id ?? data.id ?? editId;
      if (id) setSubmissionId(String(id));
    } catch {
      setBlockedHint(t('validation.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setBlockedHint(null);
    if (isEditMode) {
      void loadEditTemplate();
      return;
    }
    setTitle('');
    setDesc('');
    setModelId('dalle3');
    setPrompt('');
    setCategory('');
    setTags(['Cinematic', 'Portrait']);
    setTagInput('');
    setResultImages([]);
    setUrlDraft('');
    setUrlError(null);
    setXImportUrl('');
    setXImportError(null);
    setXImportOk(false);
  };

  const modelLabel = useMemo(() => t(`modelValues.${modelId}`), [t, modelId]);
  const categoryLabel =
    category && (CATEGORY_KEYS as readonly string[]).includes(category)
      ? t(`categories.${category as (typeof CATEGORY_KEYS)[number]}`)
      : '';

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="submit" langPathSuffix="/submit" />
      <main className="w-full">
        <div className="op-submit-shell relative">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className={`op-sp-page${success ? ' op-sp-page--simple' : ''}`}>
              <div className={`op-sp-form-area${success ? ' op-sp-form-area--simple' : ''}`}>
                {!success ? (
                  <>
                    <header className="mb-8">
                      <div className="op-sp-wizard-eyebrow">
                        {isEditMode
                          ? t('editMode.eyebrow')
                          : isPrivateMode
                            ? t('privateMode.eyebrow')
                            : t('wizard.eyebrow')}
                      </div>
                      <h1 className="op-sp-wizard-title">
                        {isEditMode ? (
                          <>
                            {t('editMode.title')}
                            <em>{t('editMode.titleEm')}</em>
                          </>
                        ) : isPrivateMode ? (
                          <>
                            {t('privateMode.title')}
                            <em>{t('privateMode.titleEm')}</em>
                          </>
                        ) : (
                          <>
                            {t('wizard.title')}
                            <em>{t('wizard.titleEm')}</em>
                          </>
                        )}
                      </h1>
                      <p className="op-sp-wizard-sub">
                        {isEditMode
                          ? t('editMode.subtitle')
                          : isPrivateMode
                            ? t('privateMode.subtitle')
                            : t('wizard.subtitleSimple')}
                      </p>
                    </header>

                    {isEditMode && loadError ? (
                      <div className="op-sp-info mb-6 border-[var(--coral)]/40">
                        <p className="text-[var(--coral)]">{loadError}</p>
                        <Link href={accountHref(locale)} className="mt-2 inline-block text-sm text-[var(--amber)]">
                          {t('editMode.backToTemplates')}
                        </Link>
                      </div>
                    ) : null}

                    {isEditMode && loadingTemplate ? (
                      <p className="mb-6 text-sm text-[var(--text2)]">{t('editMode.loading')}</p>
                    ) : null}

                    {isEditMode && (loadingTemplate || loadError) ? null : (
                      <>
                    {isPrivateMode ? (
                      <div className="op-sp-info mb-6 border-[var(--amber)]/30 bg-[color-mix(in_oklab,var(--amber)_8%,transparent)]">
                        <p>{t('privateMode.hint')}</p>
                      </div>
                    ) : null}

                    <div className="op-sp-info mb-6">
                      <p>
                        {t('info.body', { ar: t('info.ar'), v: t('info.v') })}{' '}
                        <a href="#">{t('info.link')}</a>
                      </p>
                    </div>

                    <div className="op-sp-form-group mb-6 rounded-lg border border-[var(--border2)] bg-[var(--surface)] p-4">
                      <div className="op-sp-label mb-2 !normal-case !tracking-normal">{t('xImport.title')}</div>
                      <p className="mb-3 text-xs leading-relaxed text-[var(--text2)]">{t('xImport.desc')}</p>
                      <div className="op-sp-source-row">
                        <input
                          className="op-sp-input"
                          type="url"
                          inputMode="url"
                          value={xImportUrl}
                          onChange={(e) => {
                            setXImportUrl(e.target.value);
                            setXImportError(null);
                            setXImportOk(false);
                          }}
                          placeholder={t('xImport.placeholder')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void runXImport();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="op-sp-btn-next shrink-0 whitespace-nowrap py-2"
                          disabled={xImportBusy}
                          onClick={() => void runXImport()}
                        >
                          {xImportBusy ? t('xImport.busy') : t('xImport.button')}
                        </button>
                      </div>
                      {xImportError ? <p className="mt-2 text-xs text-[var(--coral)]">{xImportError}</p> : null}
                      {xImportOk ? <p className="mt-2 text-xs text-[var(--teal)]">{t('xImport.success')}</p> : null}
                    </div>

                    <div className="op-sp-form-group">
                      <label className="op-sp-label" htmlFor="f-title">
                        {t('labels.templateTitle')} <span className="op-req">*</span>
                        <span className="op-hint">{t('hints.title')}</span>
                      </label>
                      <input
                        id="f-title"
                        className={`op-sp-input${shakeId === 'f-title' ? ' op-shake' : ''}`}
                        maxLength={60}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t('placeholders.title')}
                      />
                    </div>

                    <div className="op-sp-form-group">
                      <label className="op-sp-label" htmlFor="f-desc">
                        {t('labels.shortDesc')}
                        <span className="op-hint">{t('hints.desc')}</span>
                      </label>
                      <input
                        id="f-desc"
                        className="op-sp-input"
                        maxLength={120}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder={t('placeholders.desc')}
                      />
                    </div>

                    <div className="op-sp-form-group">
                      <label className="op-sp-label" htmlFor="f-model">
                        {t('labels.model')} <span className="op-req">*</span>
                      </label>
                      <div className="op-sp-select-wrap">
                        <select
                          id="f-model"
                          className="op-sp-select"
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value as (typeof MODEL_IDS)[number])}
                        >
                          {MODEL_IDS.map((id) => (
                            <option key={id} value={id}>
                              {`${MODEL_EMOJI[id]} ${t(`models.${id}.name`)} · ${t(`models.${id}.tag`)}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="op-sp-form-group">
                      <label className="op-sp-label" htmlFor="f-category">
                        {t('labels.category')} <span className="op-req">*</span>
                      </label>
                      <div className="op-sp-select-wrap">
                        <select
                          id="f-category"
                          className={`op-sp-select${shakeId === 'f-category' ? ' op-shake' : ''}`}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          <option value="">{t('placeholders.category')}</option>
                          {CATEGORY_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {t(`categories.${k}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="op-sp-form-group">
                      <label className="op-sp-label" htmlFor="tag-input">
                        {t('labels.tags')} <span className="op-req">*</span>
                        <span className="op-hint">{t('hints.tags')}</span>
                      </label>
                      <div
                        id="op-tag-wrap"
                        className={`op-sp-tag-wrap${shakeId === 'tag-wrap' ? ' op-shake' : ''}`}
                        onClick={() => document.getElementById('tag-input')?.focus()}
                      >
                        {tags.map((tag) => (
                          <span key={tag} className="op-sp-tag-chip">
                            {tag}{' '}
                            <button type="button" onClick={() => removeTag(tag)}>
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          id="tag-input"
                          className="op-sp-tag-input"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={onTagKeyDown}
                          placeholder={t('placeholders.tagInput')}
                        />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {quickTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="op-sp-sugg"
                            onClick={() => {
                              if (tags.includes(tag) || tags.length >= 8) return;
                              setTags((p) => [...p, tag]);
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="op-sp-form-group">
                      <label className="op-sp-label" htmlFor="f-prompt">
                        {t('labels.prompt')} <span className="op-req">*</span>
                        <span className="op-hint">{t('hints.promptCount', { count: prompt.length })}</span>
                      </label>
                      <textarea
                        id="f-prompt"
                        className={`op-sp-textarea${shakeId === 'f-prompt' ? ' op-shake' : ''}`}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('placeholders.prompt')}
                      />
                    </div>

                    <div className="op-sp-divider">{t('guidelines.dividerImages')}</div>

                    <div className="op-sp-form-group">
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <label className="op-sp-label !mb-0">
                          {t('labels.upload')}
                          <span className="op-hint">{t('hints.upload')}</span>
                        </label>
                        <span className="shrink-0 font-mono text-[10px] text-[var(--text3)]">
                          {t('hints.imageCount', { count: resultImages.length, max: MAX_RESULT_IMAGES })}
                        </span>
                      </div>
                      <div
                        id="upload-zone"
                        className={`op-sp-upload${uploadDrag ? ' op-drag' : ''}${imagesFull ? ' op-sp-upload--full' : ''}`}
                        onDragOver={(e) => {
                          if (imagesFull) return;
                          e.preventDefault();
                          setUploadDrag(true);
                        }}
                        onDragLeave={() => setUploadDrag(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setUploadDrag(false);
                          handleFiles(e.dataTransfer.files);
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={imagesFull}
                          onChange={(e) => handleFiles(e.target.files)}
                        />
                        <div className="text-sm font-medium text-[var(--text)]">{imagesFull ? '✓' : '↑'}</div>
                        <div className="mt-1 text-xs text-[var(--text3)]">
                          {imagesFull ? t('hints.uploadFull') : t('hints.upload')}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="op-sp-label" htmlFor="f-img-url">
                          {t('labels.imageUrls')}
                          <span className="op-hint">{t('hints.urls')}</span>
                        </label>
                        <div className="op-sp-source-row">
                          <input
                            id="f-img-url"
                            className="op-sp-input"
                            value={urlDraft}
                            disabled={imagesFull}
                            onChange={(e) => {
                              setUrlDraft(e.target.value);
                              setUrlError(null);
                            }}
                            onKeyDown={onUrlKeyDown}
                            placeholder={t('placeholders.urls')}
                          />
                          <button
                            type="button"
                            className="op-sp-btn-next shrink-0 px-4 py-2 text-xs"
                            disabled={imagesFull || !urlDraft.trim()}
                            onClick={addImageUrl}
                          >
                            {t('buttons.addUrl')}
                          </button>
                        </div>
                        {urlError ? (
                          <p className="mt-1.5 text-xs text-[var(--coral)]">{urlError}</p>
                        ) : null}
                      </div>

                      {resultImages.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {resultImages.map((src, i) => (
                            <div
                              key={`${i}-${src.slice(0, 32)}`}
                              className="relative h-16 w-[5.5rem] overflow-hidden rounded-md border border-[var(--border2)] bg-[var(--surface2)]"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] text-white hover:bg-black/90"
                                aria-label={t('buttons.removeImage')}
                                onClick={() => removeImage(i)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="op-sp-form-group rounded-lg border border-[var(--border2)] bg-[var(--surface2)] p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-[var(--text2)]">{t('qualityCheck')}</span>
                        <button
                          id="op-sp-copy-btn"
                          type="button"
                          className="shrink-0 rounded border border-[var(--border2)] px-2 py-0.5 text-[10px] text-[var(--text3)] hover:text-[var(--amber)]"
                          onClick={copyPrompt}
                        >
                          {t('buttons.copyPrompt')}
                        </button>
                      </div>
                      {(
                        [
                          ['rules.promptLen', promptLenOk],
                          ['rules.title', titleOk],
                          ['rules.model', modelOk],
                          ['rules.category', categoryOk],
                          ['rules.tags', tagsOk],
                        ] as const
                      ).map(([key, ok]) => (
                        <div
                          key={key}
                          className="flex gap-2 border-b border-[var(--border)] py-1.5 text-[11px] text-[var(--text2)] last:border-0"
                        >
                          <span className={`op-sp-rule-icon ${ok ? 'ok' : 'no'}`}>{ok ? '✓' : '✕'}</span>
                          <span>{t(key)}</span>
                        </div>
                      ))}
                    </div>

                    {blockedHint ? (
                      <div
                        role="alert"
                        className="mb-3 rounded-lg border border-[color-mix(in_oklab,var(--coral)_35%,transparent)] bg-[var(--coral-dim)] px-3 py-2 text-xs leading-snug text-[var(--coral)]"
                      >
                        {blockedHint}
                      </div>
                    ) : null}

                    <div className="op-sp-form-nav mt-8 justify-end border-0 pt-2">
                      <button
                        type="button"
                        className="op-sp-btn-next op-submit"
                        disabled={submitting}
                        aria-busy={submitting}
                        onClick={() => void doSubmit()}
                      >
                        {submitting
                          ? t('buttons.submitting')
                          : isEditMode
                            ? t('editMode.save')
                            : isPrivateMode
                              ? t('privateMode.submit')
                              : t('buttons.submit')}
                      </button>
                    </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="op-sp-success op-show">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(45,212,160,0.3)] bg-[var(--teal-dim)] text-2xl">
                      🎉
                    </div>
                    <h2 className="mb-2 text-2xl font-semibold">
                      {isEditMode
                        ? t('editMode.successTitle')
                        : isPrivateMode
                          ? t('privateMode.successTitle')
                          : t('success.title')}
                      <em className="italic text-[var(--teal)]">
                        {isEditMode
                          ? t('editMode.successTitleEm')
                          : isPrivateMode
                            ? t('privateMode.successTitleEm')
                            : t('success.titleEm')}
                      </em>
                    </h2>
                    <p className="mx-auto mb-6 max-w-[340px] text-sm font-light leading-relaxed text-[var(--text2)]">
                      {isEditMode
                        ? t('editMode.successBody')
                        : isPrivateMode
                          ? t('privateMode.successBody')
                          : t('success.body')}
                    </p>
                    <p className="mb-4 text-center text-[11px] text-[var(--text3)]">
                      {modelLabel}
                      {categoryLabel ? ` · ${categoryLabel}` : null}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {isEditMode || isPrivateMode ? (
                        <Link href={accountHref(locale)} className="op-sp-btn-next">
                          {t('privateMode.goToMyTemplates')}
                        </Link>
                      ) : (
                        <Link href={galleryHref} className="op-sp-btn-next">
                          {t('buttons.browseGallery')}
                        </Link>
                      )}
                      <button type="button" className="op-sp-btn-back" onClick={resetForm}>
                        {isEditMode
                          ? t('editMode.continueEdit')
                          : isPrivateMode
                            ? t('privateMode.createAnother')
                            : t('buttons.submitAnother')}
                      </button>
                      {!isEditMode && !isPrivateMode ? (
                        <Link href={accountHref(locale)} className="op-sp-btn-back">
                          {t('buttons.myTemplates')}
                        </Link>
                      ) : null}
                    </div>
                    <p className="mt-4 font-mono text-[11px] text-[var(--text3)]">
                      {t('success.idLabel', { id: submissionId })}
                    </p>
                  </div>
                )}
              </div>

              {!success && !(isEditMode && (loadingTemplate || loadError)) ? (
                <aside className="op-sp-preview-pane">
                  <div className="op-sp-pane-h">
                    <span className="text-xs font-medium tracking-wide text-[var(--text2)]">{t('preview.paneTitle')}</span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--teal)]">
                      <span className="inline-block h-1 w-1 rounded-full bg-[var(--teal)]" />
                      {t('preview.live')}
                    </span>
                  </div>
                  <div className="op-sp-pane-body">
                    <div className="op-sp-card">
                      <div className="op-sp-card-media">
                        <SubmitPreviewImageStrip
                          images={previewImageUrls}
                          titleLabel={title.trim() || t('preview.titleEmpty')}
                          coverLoadFailedText={tGallery('coverLoadFailed')}
                          emptyLabel={t('preview.uploadPlaceholder')}
                        />
                      </div>
                      <div className="p-3">
                        <div className="mb-2 flex items-center gap-1 text-[10px] text-[var(--text3)]">
                          <span>◎</span> {modelLabel}
                        </div>
                        <div
                          className={`mb-1 text-sm font-medium ${title.trim() ? 'text-[var(--text)]' : 'italic text-[var(--text3)]'}`}
                        >
                          {title.trim() || t('preview.titleEmpty')}
                        </div>
                        <div className="mb-2 min-h-[2rem] text-[11px] text-[var(--text3)]">
                          {desc.trim() || t('preview.descEmpty')}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="rounded border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[10px] text-[var(--text3)]">
                            {categoryLabel || t('preview.categoryFallback')}
                          </span>
                          <span className="rounded-md bg-[var(--amber)] px-2 py-1 text-[11px] font-medium text-[#0e0d0b]">
                            {t('preview.generateCta')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="op-sp-code-block">
                      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-[var(--text3)]">
                        {t('labels.prompt')}
                        <button
                          type="button"
                          className="rounded border border-[var(--border2)] px-1.5 py-0.5 text-[10px] text-[var(--text3)] hover:text-[var(--amber)]"
                          onClick={copyPrompt}
                          title={t('buttons.copyPrompt')}
                        >
                          {t('buttons.copyPrompt')}
                        </button>
                      </div>
                      <p className={prompt.trim() ? '' : 'italic text-[var(--text3)]'}>
                        {prompt.trim() || t('preview.promptEmpty')}
                      </p>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-[color-mix(in_oklab,var(--amber)_20%,transparent)] bg-[var(--amber-dim)] px-2 py-0.5 text-[10px] text-[var(--amber)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
