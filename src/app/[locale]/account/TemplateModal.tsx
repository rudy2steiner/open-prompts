'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { localeApiPath } from '~/lib/locale-api-path';
import { modelLabelToId, type TemplateRecord } from '~/lib/prompts/template-types';

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

const MODEL_IDS = ['gptImage2', 'midjourney', 'dalle3', 'flux', 'sd', 'ideogram'] as const;

type Visibility = 'public' | 'private' | 'draft';

type Props = {
  locale: string;
  open: boolean;
  initial: TemplateRecord | null;
  onClose: () => void;
  onSaved: () => void;
};

function pickCategory(tags: string[]) {
  const hit = tags.find((t) => (CATEGORY_KEYS as readonly string[]).includes(t));
  return hit ?? 'landscape';
}

export function TemplateModal({ locale, open, initial, onClose, onSaved }: Props) {
  const t = useTranslations('OpenPrompts.accountPage');
  const tSubmit = useTranslations('OpenPrompts.submitPage');

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [modelId, setModelId] = useState<(typeof MODEL_IDS)[number]>('gptImage2');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('draft');
  const [coverUrl, setCoverUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      const cat = pickCategory(initial.tags);
      setTitle(initial.title);
      setDescription(initial.description);
      setPrompt(initial.prompt);
      setModelId(modelLabelToId(initial.model) as (typeof MODEL_IDS)[number]);
      setCategory(cat);
      setTags(initial.tags.filter((x) => x !== cat));
      setVisibility(initial.visibility as Visibility);
      setCoverUrl(initial.images[0] ?? '');
    } else {
      setTitle('');
      setDescription('');
      setPrompt('');
      setModelId('gptImage2');
      setCategory('');
      setTags([]);
      setVisibility('draft');
      setCoverUrl('');
    }
  }, [open, initial]);

  const addTag = (raw: string) => {
    const val = raw.replace(',', '').trim();
    if (!val || tags.includes(val) || tags.length >= 7) return;
    setTags((p) => [...p, val]);
  };

  const save = async () => {
    setError(null);
    if (!title.trim() || !prompt.trim() || prompt.trim().length < 10 || !category || tags.length < 2) {
      setError(t('modal.validation'));
      return;
    }
    const images = coverUrl.trim() && /^https?:\/\//i.test(coverUrl.trim()) ? [coverUrl.trim()] : [];

    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        prompt: prompt.trim(),
        modelId,
        category,
        tags,
        images,
        visibility,
      };
      const path = initial
        ? localeApiPath(locale, `/api/my/templates/${initial.id}`)
        : localeApiPath(locale, '/api/my/templates');
      const res = await fetch(path, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || t('modal.saveFailed'));
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError(t('modal.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`op-account-modal-overlay${open ? ' open' : ''}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="op-account-modal" role="dialog" aria-modal="true">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-[var(--text)]">
            {initial ? t('modal.editTitle') : t('modal.createTitle')}
          </h2>
          <button type="button" className="op-account-row-btn" onClick={onClose} aria-label={t('modal.cancel')}>
            ✕
          </button>
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{tSubmit('labels.title')}</label>
          <input className="op-account-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{tSubmit('labels.prompt')}</label>
          <textarea className="op-account-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{tSubmit('labels.category')}</label>
          <select
            className="op-account-form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{tSubmit('placeholders.category')}</option>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {tSubmit(`categories.${k}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{tSubmit('labels.tags')}</label>
          <div className="op-account-tag-wrap">
            {tags.map((tag) => (
              <span key={tag} className="op-account-tag-chip">
                {tag}
                <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== tag))}>
                  ×
                </button>
              </span>
            ))}
            <input
              className="min-w-[80px] flex-1 border-0 bg-transparent text-xs text-[var(--text)] outline-none"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ',') return;
                e.preventDefault();
                addTag(tagInput);
                setTagInput('');
              }}
              placeholder={tSubmit('placeholders.tagInput')}
            />
          </div>
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{t('modal.model')}</label>
          <select
            className="op-account-form-select"
            value={modelId}
            onChange={(e) => setModelId(e.target.value as (typeof MODEL_IDS)[number])}
          >
            {MODEL_IDS.map((id) => (
              <option key={id} value={id}>
                {tSubmit(`models.${id}.name`)}
              </option>
            ))}
          </select>
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{t('modal.visibility')}</label>
          <div className="op-account-vis-group">
            {(['public', 'private', 'draft'] as const).map((v) => (
              <div key={v} className="op-account-vis-pill relative">
                <input
                  type="radio"
                  name="vis"
                  id={`vis-${v}`}
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                />
                <label htmlFor={`vis-${v}`}>{t(`visibility.${v}`)}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="op-account-form-group">
          <label className="op-account-form-label">{t('modal.coverUrl')}</label>
          <input
            className="op-account-input"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        {error ? <p className="mb-3 text-xs text-[var(--coral)]">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" className="op-account-btn" onClick={onClose} disabled={busy}>
            {t('modal.cancel')}
          </button>
          <button type="button" className="op-account-btn primary" onClick={() => void save()} disabled={busy}>
            {busy ? t('modal.saving') : t('modal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
