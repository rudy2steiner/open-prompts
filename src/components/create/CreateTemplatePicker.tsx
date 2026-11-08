'use client';

import '../../app/[locale]/image-prompts/gallery-page.css';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { GalleryFilterStrip } from '~/components/prompt-gallery/GalleryFilterStrip';
import { PromptGalleryCard } from '~/components/prompt-gallery/PromptGalleryCard';
import { PromptGalleryMasonry } from '~/components/prompt-gallery/PromptGalleryMasonry';
import { PromptGallerySwipeViewer } from '~/components/prompt-gallery/PromptGallerySwipeViewer';
import {
  filterPromptGalleryItems,
  mergeCategoryTags,
  type SubmitCategoryKey,
} from '~/lib/prompts/prompt-categories';
import { formatSubTagLabel } from '~/lib/prompts/sub-tag-i18n';
import { galleryCoverUrl } from '~/lib/prompts/gallery-cover-url';

const PICKER_PAGE_SIZE = 30;
const promptItemKey = (prompt: PromptGalleryItem) => prompt.id;

function imageAspectLabel(width: number, height: number): string {
  const common: Array<[string, number]> = [
    ['1:1', 1],
    ['4:3', 4 / 3],
    ['3:4', 3 / 4],
    ['16:9', 16 / 9],
    ['9:16', 9 / 16],
    ['3:2', 3 / 2],
    ['2:3', 2 / 3],
    ['4:5', 4 / 5],
  ];
  const ratio = width / height;
  return common.reduce((best, candidate) =>
    Math.abs(candidate[1] - ratio) < Math.abs(best[1] - ratio) ? candidate : best,
  )[0];
}

type Props = {
  open: boolean;
  prompts: PromptGalleryItem[];
  selectedId: string;
  disabled?: boolean;
  onClose: () => void;
  onSelect: (prompt: PromptGalleryItem) => void;
};

export function CreateTemplatePicker({ open, prompts, selectedId, disabled = false, onClose, onSelect }: Props) {
  const t = useTranslations('OpenPrompts');
  const tSubmit = useTranslations('OpenPrompts.submitPage');
  const [query, setQuery] = useState('');
  const [ratioById, setRatioById] = useState<Record<string, string>>({});
  const [aspectById, setAspectById] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PromptGalleryItem | null>(null);
  const [categoryId, setCategoryId] = useState<'all' | SubmitCategoryKey>('all');
  const [subTag, setSubTag] = useState<string | null>(null);
  const subTags = useMemo(
    () => (categoryId === 'all' ? [] : mergeCategoryTags(categoryId, prompts)),
    [categoryId, prompts],
  );
  const models = useMemo(
    () => ['all', ...Array.from(new Set(prompts.map((prompt) => prompt.model))).sort((a, b) => a.localeCompare(b))],
    [prompts],
  );
  const [model, setModel] = useState('all');
  const [limit, setLimit] = useState(PICKER_PAGE_SIZE);
  const filtered = useMemo(
    () => filterPromptGalleryItems(prompts, { query, model, categoryId, subTag }),
    [prompts, query, model, categoryId, subTag],
  );
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  useEffect(() => {
    setLimit(PICKER_PAGE_SIZE);
  }, [query, model, categoryId, subTag]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('createPage.templatesLabel')}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-md flex-col border-r border-[var(--border2)] bg-[var(--panel-bg)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">{t('createPage.templatesLabel')}</h2>
            <p className="mt-1 text-xs text-[var(--text2)]">{t('createPage.popularSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-lg text-[var(--text2)] hover:bg-[var(--surface2)]"
            aria-label={t('createPage.viewerClose')}
          >
            ×
          </button>
        </div>
        <div className="border-b border-[var(--border)] p-3">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('createPage.searchTemplatesPlaceholder')}
            className="h-10 w-full rounded-xl border border-[var(--border2)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
          />
          <div className="mt-3 [&_.op-gallery-cat-pill]:shrink-0 [&_.op-gallery-cat-pill]:whitespace-nowrap [&_.op-gallery-subtag-pill]:shrink-0 [&_.op-gallery-subtag-pill]:whitespace-nowrap">
            <GalleryFilterStrip
              models={models}
              model={model}
              onModelChange={setModel}
              categoryId={categoryId}
              onCategoryChange={(next) => {
                setCategoryId(next);
                setSubTag(null);
              }}
              subTags={subTags}
              subTag={subTag}
              onSubTagChange={(next) => setSubTag((current) => (current === next ? null : next))}
              categoryLabel={(id) => tSubmit(`categories.${id}`)}
              subTagLabel={(tag) =>
                formatSubTagLabel(tag, (key) => tSubmit(`subTags.${key}`))
              }
              allModelsLabel={t('filters.allModels')}
              allCategoriesLabel={t('filters.allCategories')}
              showingLabel={t('gallery.showing', { shown: visible.length, total: filtered.length })}
            />
          </div>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-3"
          onScroll={(event) => {
            const target = event.currentTarget;
            const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
            if (remaining > 500) return;
            setLimit((current) => Math.min(filtered.length, current + PICKER_PAGE_SIZE));
          }}
        >
          {filtered.length ? (
            <PromptGalleryMasonry
              items={visible}
              itemKey={promptItemKey}
              columnMinWidth={180}
              bootstrap={false}
              layoutKey={`${model}:${categoryId}:${subTag ?? ''}:${query}`}
              renderItem={(prompt) => {
                const active = prompt.id === selectedId;
                return (
                  <div
                    className={`rounded-2xl transition ${
                      active
                        ? 'ring-2 ring-[var(--amber)] ring-offset-2 ring-offset-[var(--panel-bg)]'
                        : ''
                    } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <PromptGalleryCard
                      item={prompt}
                      coverSrc={galleryCoverUrl(prompt.images[0])}
                      coverSizes="220px"
                      coverAspectRatio={ratioById[prompt.id] ?? '4 / 3'}
                      naturalCover
                      modelBadge={prompt.model}
                      description={prompt.description}
                      tags={prompt.tags}
                      aspectTag={aspectById[prompt.id] ?? null}
                      showDescription
                      showTags
                      showAuthor={false}
                          layout="masonry"
                      coverFit="contain"
                      coverErrorText={t('gallery.coverLoadFailed')}
                      onCardClick={disabled ? undefined : () => onSelect(prompt)}
                      onImageClick={
                        prompt.images.length
                          ? () => setPreview(prompt)
                          : undefined
                      }
                      onMeta={({ width, height }) => {
                        const ratio = `${width} / ${height}`;
                        const aspect = imageAspectLabel(width, height);
                        setRatioById((current) =>
                          current[prompt.id] === ratio ? current : { ...current, [prompt.id]: ratio },
                        );
                        setAspectById((current) =>
                          current[prompt.id] === aspect ? current : { ...current, [prompt.id]: aspect },
                        );
                      }}
                    />
                  </div>
                );
              }}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border2)] p-8 text-center text-sm text-[var(--text3)]">
              {t('createPage.templateNoResults')}
            </div>
          )}
        </div>
      </div>
      {preview ? (
        <PromptGallerySwipeViewer
          open
          onClose={() => setPreview(null)}
          images={preview.images}
          title={preview.title}
          imageKeyPrefix={`picker-${preview.id}`}
          coverLoadFailedText={t('gallery.coverLoadFailed')}
          closeLabel={t('createPage.viewerClose')}
          prevLabel={t('createPage.viewerPrev')}
          nextLabel={t('createPage.viewerNext')}
          overlayClassName="!z-[100] bg-black/80"
        />
      ) : null}
    </div>
  );
}
