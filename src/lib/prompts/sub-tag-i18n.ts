import { SUBMIT_CATEGORY_TAGS, SUBMIT_QUICK_TAGS } from '~/lib/prompts/prompt-categories';

/** Stable i18n key for a canonical English sub-tag value stored in `tags[]`. */
export function subTagI18nKey(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export const SUB_TAG_I18N_KEYS = new Set(
  [...Object.values(SUBMIT_CATEGORY_TAGS).flat(), ...SUBMIT_QUICK_TAGS].map(subTagI18nKey),
);

/** Display label for gallery/submit sub-tags; falls back to raw tag for dynamic values. */
export function formatSubTagLabel(tag: string, translate: (key: string) => string): string {
  const key = subTagI18nKey(tag);
  if (!SUB_TAG_I18N_KEYS.has(key)) return tag;
  return translate(key);
}
