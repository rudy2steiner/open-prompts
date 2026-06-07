'use client';

import { type SubmitCategoryKey } from '~/lib/prompts/prompt-categories';
import { PromptCategoryStrip } from '~/components/prompt-gallery/PromptCategoryStrip';

type Props = {
  models: string[];
  model: string;
  onModelChange: (model: string) => void;
  categoryId: 'all' | SubmitCategoryKey;
  onCategoryChange: (id: 'all' | SubmitCategoryKey) => void;
  subTag: string | null;
  onSubTagChange: (tag: string) => void;
  subTags: string[];
  allModelsLabel: string;
  allCategoriesLabel: string;
  categoryLabel: (id: SubmitCategoryKey) => string;
  subTagLabel?: (tag: string) => string;
  showingLabel?: string;
};

export function GalleryFilterStrip({
  models,
  model,
  onModelChange,
  categoryId,
  onCategoryChange,
  subTag,
  onSubTagChange,
  subTags,
  allModelsLabel,
  allCategoriesLabel,
  categoryLabel,
  subTagLabel,
  showingLabel,
}: Props) {
  return (
    <div className="space-y-0">
      <div className="op-gallery-filter-scroll flex gap-2 overflow-x-auto pb-2">
        {models.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModelChange(m)}
            className={`op-gallery-model-pill ${model === m ? 'active' : 'idle'}`}
          >
            {m === 'all' ? allModelsLabel : m}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <PromptCategoryStrip
          categoryId={categoryId}
          onCategoryChange={onCategoryChange}
          subTags={subTags}
          subTag={subTag}
          onSubTagChange={onSubTagChange}
          categoryLabel={categoryLabel}
          subTagLabel={subTagLabel}
          allCategoriesLabel={allCategoriesLabel}
          showAll
        />
      </div>

      {showingLabel ? (
        <div className="mt-3 text-right text-xs text-[var(--text3)]">{showingLabel}</div>
      ) : null}
    </div>
  );
}
