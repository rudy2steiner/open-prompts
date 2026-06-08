import type { PromptGalleryItem } from '~/data/promptGallery';
import {
  resolvePromptCategory,
  SUBMIT_CATEGORY_KEYS,
  type SubmitCategoryKey,
} from '~/lib/prompts/prompt-categories';
import { formatGalleryStatCount } from '~/lib/prompts/gallery-stats';

/** Models shown on the landing SEO section, in display order. */
export const LANDING_SEO_MODELS = ['GPT Image 2', 'DALL·E 3', 'Midjourney'] as const;

/** Categories shown on the landing SEO section, in display order. */
export const LANDING_SEO_CATEGORIES = [
  'portraitPhoto',
  'artStyles',
  'productCommercial',
  'gameFantasy',
] as const satisfies readonly SubmitCategoryKey[];

export type LandingSeoCategory = (typeof LANDING_SEO_CATEGORIES)[number];

export function countPromptsByModel(prompts: PromptGalleryItem[], model: string): number {
  return prompts.filter((p) => p.model === model).length;
}

export function countPromptsByCategory(prompts: PromptGalleryItem[], category: SubmitCategoryKey): number {
  return prompts.filter((p) => resolvePromptCategory(p.category, p.tags) === category).length;
}

export function formatLandingCount(n: number, locale: string): string {
  return formatGalleryStatCount(n, locale);
}

export function landingModelCounts(prompts: PromptGalleryItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const model of LANDING_SEO_MODELS) {
    out[model] = countPromptsByModel(prompts, model);
  }
  for (const p of prompts) {
    if (!LANDING_SEO_MODELS.includes(p.model as (typeof LANDING_SEO_MODELS)[number])) {
      out[p.model] = (out[p.model] ?? 0) + 1;
    }
  }
  return out;
}

export function landingCategoryCounts(prompts: PromptGalleryItem[]): Record<SubmitCategoryKey, number> {
  const out = Object.fromEntries(SUBMIT_CATEGORY_KEYS.map((k) => [k, 0])) as Record<
    SubmitCategoryKey,
    number
  >;
  for (const p of prompts) {
    const cat = resolvePromptCategory(p.category, p.tags);
    if (cat) out[cat] += 1;
  }
  return out;
}
