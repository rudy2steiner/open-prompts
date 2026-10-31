import { cache } from 'react';
import { PROMPT_GALLERY, type PromptGalleryItem } from '~/data/promptGallery';
import { fetchPromptGalleryFromDb } from '~/lib/prompts/from-db';

/**
 * Loads the prompt catalog: D1 (Drizzle + DB binding) when non-empty, else bundled JSON.
 * React `cache()` dedupes within one request (e.g. generateMetadata + page). Full gallery
 * exceeds Next.js `unstable_cache` 2MB limit, so cross-request caching relies on page ISR.
 */
export const getPromptGallery = cache(async (): Promise<PromptGalleryItem[]> => {
  const fromDb = await fetchPromptGalleryFromDb();
  if (fromDb && fromDb.length > 0) return fromDb;
  return PROMPT_GALLERY;
});

/** Sitemap / build: never fail — fall back to bundled JSON if DB is slow or empty. */
export async function getPromptGalleryForSitemap(): Promise<PromptGalleryItem[]> {
  try {
    const fromDb = await fetchPromptGalleryFromDb();
    if (fromDb && fromDb.length > 0) return fromDb;
  } catch {
    // Workers binding or query failure — bundled slugs still give crawlable URLs.
  }
  return PROMPT_GALLERY;
}
