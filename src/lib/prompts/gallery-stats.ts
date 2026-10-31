import { localeTagFor } from '~/i18n/locales';
import type { PromptGalleryItem } from '~/data/promptGallery';

export function formatGalleryStatCount(n: number, locale: string): string {
  const tag = localeTagFor(locale);
  return new Intl.NumberFormat(tag).format(n);
}

export function countGalleryModels(prompts: Pick<PromptGalleryItem, 'model'>[]): number {
  return new Set(prompts.map((p) => p.model).filter(Boolean)).size;
}
