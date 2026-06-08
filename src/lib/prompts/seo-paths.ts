import { buildLocaleHref } from '~/lib/op-locale';
import { SUBMIT_CATEGORY_KEYS, type SubmitCategoryKey } from '~/lib/prompts/prompt-categories';

export const MODEL_SEO_SLUGS = {
  'gpt-image-2': 'GPT Image 2',
  'dalle-3': 'DALL·E 3',
  midjourney: 'Midjourney',
  'stable-diffusion': 'Stable Diffusion',
} as const;

export type ModelSeoSlug = keyof typeof MODEL_SEO_SLUGS;

export const CATEGORY_SEO_SLUGS: Record<SubmitCategoryKey, string> = {
  artStyles: 'art-styles',
  portraitPhoto: 'portrait-photo',
  designUi: 'design-ui',
  gameFantasy: 'game-fantasy',
  scenes: 'scenes',
  productCommercial: 'product-commercial',
  styleEra: 'style-era',
};

const CATEGORY_SLUG_TO_KEY = Object.fromEntries(
  Object.entries(CATEGORY_SEO_SLUGS).map(([key, slug]) => [slug, key]),
) as Record<string, SubmitCategoryKey>;

export const MODEL_SEO_SLUG_LIST = Object.keys(MODEL_SEO_SLUGS) as ModelSeoSlug[];
export const CATEGORY_SEO_SLUG_LIST = SUBMIT_CATEGORY_KEYS.map((key) => CATEGORY_SEO_SLUGS[key]);

export function categoryKeyToSeoSlug(key: SubmitCategoryKey): string {
  return CATEGORY_SEO_SLUGS[key];
}

export function resolveCategorySeoSlug(slug: string): SubmitCategoryKey | null {
  return CATEGORY_SLUG_TO_KEY[slug] ?? null;
}

export function resolveModelSeoSlug(slug: string): string | null {
  return MODEL_SEO_SLUGS[slug as ModelSeoSlug] ?? null;
}

export function modelLabelToSeoSlug(label: string): ModelSeoSlug | null {
  for (const [slug, model] of Object.entries(MODEL_SEO_SLUGS)) {
    if (model === label) return slug as ModelSeoSlug;
  }
  return null;
}

export function promptHref(locale: string, slug: string): string {
  return buildLocaleHref(locale, `/prompt/${slug}`);
}

export function modelLandingHref(locale: string, slug: ModelSeoSlug | string): string {
  return buildLocaleHref(locale, `/model/${slug}`);
}

export function categoryLandingHref(locale: string, slug: string): string {
  return buildLocaleHref(locale, `/category/${slug}`);
}
