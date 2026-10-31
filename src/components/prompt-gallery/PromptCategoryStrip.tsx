'use client';

import {
  SUBMIT_CATEGORY_EMOJI,
  SUBMIT_CATEGORY_KEYS,
  type SubmitCategoryKey,
} from '~/lib/prompts/prompt-categories';

type Props = {
  categoryId: 'all' | SubmitCategoryKey | '';
  onCategoryChange: (id: 'all' | SubmitCategoryKey) => void;
  subTags: string[];
  subTag: string | null;
  onSubTagChange: (tag: string) => void;
  categoryLabel: (id: SubmitCategoryKey) => string;
  subTagLabel?: (tag: string) => string;
  allCategoriesLabel?: string;
  showAll?: boolean;
  /** Highlight sub-tags already chosen (submit form). */
  selectedTags?: readonly string[];
};

export function PromptCategoryStrip({
  categoryId,
  onCategoryChange,
  subTags,
  subTag,
  onSubTagChange,
  categoryLabel,
  subTagLabel,
  allCategoriesLabel,
  showAll = true,
  selectedTags,
}: Props) {
  const activeCategory = categoryId === '' ? null : categoryId;
  const subTagsOpen = activeCategory !== null && activeCategory !== 'all' && subTags.length > 0;

  return (
    <div className={showAll ? 'border-t border-[var(--border)] pt-3' : ''}>
      <div className="op-gallery-filter-scroll flex items-center gap-2 overflow-x-auto pb-1">
        {showAll && allCategoriesLabel ? (
          <>
            <button
              type="button"
              onClick={() => onCategoryChange('all')}
              className={`op-gallery-cat-pill ${categoryId === 'all' ? 'active' : ''}`}
            >
              <span aria-hidden className="text-[10px] opacity-80">
                ◈
              </span>
              {allCategoriesLabel}
            </button>
            <span className="op-gallery-cat-divider" aria-hidden />
          </>
        ) : null}
        {SUBMIT_CATEGORY_KEYS.map((catId) => (
          <button
            key={catId}
            type="button"
            onClick={() => onCategoryChange(catId)}
            className={`op-gallery-cat-pill ${categoryId === catId ? 'active' : ''}`}
          >
            <span aria-hidden>{SUBMIT_CATEGORY_EMOJI[catId]}</span>
            {categoryLabel(catId)}
          </button>
        ))}
      </div>

      <div className={`op-gallery-subtags-wrap${subTagsOpen ? ' open' : ''}`}>
        <div className="op-gallery-subtags-inner">
          <div className="op-gallery-subtags-row op-gallery-filter-scroll overflow-x-auto pb-2">
            {subTags.map((tag) => {
              const isActive = selectedTags
                ? selectedTags.some((t) => t.toLowerCase() === tag.toLowerCase())
                : subTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onSubTagChange(tag)}
                  className={`op-gallery-subtag-pill ${isActive ? 'active' : ''}`}
                >
                  {subTagLabel ? subTagLabel(tag) : tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
