import type { PromptGalleryItem } from '~/data/promptGallery';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';

export async function getPromptBySlug(slug: string): Promise<PromptGalleryItem | null> {
  const gallery = await getPromptGallery();
  return gallery.find((p) => p.id === slug) ?? null;
}
