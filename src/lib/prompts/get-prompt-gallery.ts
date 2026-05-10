import { PROMPT_GALLERY, type PromptGalleryItem } from '~/data/promptGallery';
import { fetchPromptGalleryFromDb } from '~/lib/prompts/from-db';

/**
 * Loads the prompt catalog: Postgres (Drizzle + DATABASE_URL) when non-empty, else bundled JSON.
 */
export async function getPromptGallery(): Promise<PromptGalleryItem[]> {
  const fromDb = await fetchPromptGalleryFromDb();
  if (fromDb && fromDb.length > 0) return fromDb;
  return PROMPT_GALLERY;
}
