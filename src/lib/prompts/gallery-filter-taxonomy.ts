export {
  SUBMIT_CATEGORY_KEYS as GALLERY_CATEGORY_IDS,
  SUBMIT_CATEGORY_EMOJI as GALLERY_CATEGORY_EMOJI,
  SUBMIT_CATEGORY_TAGS as GALLERY_CATEGORY_TAGS,
  type SubmitCategoryKey as GalleryCategoryId,
  getSubmitCategoryTags,
  mergeCategoryTags,
  promptMatchesGalleryFilter,
  isSubmitCategoryKey,
  normalizeSubmitCategoryKey,
  resolvePromptCategory,
} from '~/lib/prompts/prompt-categories';

import {
  SUBMIT_CATEGORY_KEYS,
  SUBMIT_CATEGORY_EMOJI,
  type SubmitCategoryKey,
  getSubmitCategoryTags,
} from '~/lib/prompts/prompt-categories';

export function getGalleryCategory(id: SubmitCategoryKey) {
  return { id, emoji: SUBMIT_CATEGORY_EMOJI[id], subTags: getSubmitCategoryTags(id) };
}

export const GALLERY_CATEGORIES = SUBMIT_CATEGORY_KEYS.map((id) => ({
  id,
  emoji: SUBMIT_CATEGORY_EMOJI[id],
  subTags: [...getSubmitCategoryTags(id)],
}));

/** @deprecated Use promptMatchesGalleryFilter */
export { promptMatchesGalleryFilter as promptMatchesGalleryTag } from '~/lib/prompts/prompt-categories';
