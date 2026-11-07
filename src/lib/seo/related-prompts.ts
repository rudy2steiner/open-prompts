import type { PromptGalleryItem } from '~/data/promptGallery';
import { resolvePromptCategory } from '~/lib/prompts/prompt-categories';

export function pickRelatedPrompts(
  prompt: PromptGalleryItem,
  gallery: readonly PromptGalleryItem[],
  limit = 12,
): PromptGalleryItem[] {
  const category = resolvePromptCategory(prompt.category, prompt.tags);
  const tags = new Set(prompt.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
  return gallery
    .filter((item) => item.id !== prompt.id)
    .map((item) => {
      const shared = item.tags.filter((tag) => tags.has(tag.trim().toLowerCase())).length;
      const sameCategory = category && resolvePromptCategory(item.category, item.tags) === category ? 1 : 0;
      const sameModel = Boolean(item.model && item.model === prompt.model);
      return { item, score: sameCategory * 4 + shared * 2 + Number(sameModel) };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((row) => row.item);
}
