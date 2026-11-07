import type { PromptGalleryItem } from '~/data/promptGallery';
import { galleryCoverUrl } from '~/lib/prompts/gallery-cover-url';
import {
  resolvePromptCategory,
  type SubmitCategoryKey,
} from '~/lib/prompts/prompt-categories';

/** 分类目录封面。固定到具体提示词，不随图库新增而换图。 */
export const CATEGORY_FEATURED_PROMPT_IDS: Record<SubmitCategoryKey, readonly string[]> = {
  artStyles: [
    'hand-drawn-illustration-3ffb256b',
    'photo-ink-vignette-art-e677a6d3',
    'frozen-era-steam-scene-2f60ae90',
    'japanese-shinto-style-female-portrait-89',
  ],
  portraitPhoto: [
    'candid-street-fashion-4e88f95c',
    'y2k-sneaker-editorial-b3902fad',
    'ivory-garden-fashion-28b3694f',
    'emerald-elegance-magazine-cover-74',
  ],
  designUi: [
    'travel-badge-poster-b9250fd2',
    'santorini-travel-poster-5c5de11a',
    'e-bus-tech-infographic-29a1fbe6',
    'urban-architecture-board-b7d865da',
  ],
  gameFantasy: [
    'gta-6-style-urban-realism-1',
    'celestial-galaxy-pair-6d5dc2d7',
    'dark-fantasy-warrior-in-mist-40',
    'bioluminescent-guardian-5f4b2e3a',
  ],
  scenes: [
    'illustrated-city-panorama-d355425b',
    'royal-carriage-street-37bb5865',
    'winter-city-diorama-97f0ba61',
    'watercolor-photo-vignette-76967165',
  ],
  productCommercial: [
    'digital-camera-campaign-3f396f8f',
    'blue-headphone-editorial-b8ac6f61',
    'rustic-coconut-desserts-ab77eaa0',
    'stanley-x-jellycat-campaign-concept-15',
  ],
  styleEra: [
    'republican-era-qipao-37e738ed',
    'analog-fashion-collage-4bcd224b',
    'vintage-photo-restoration-a36b15f4',
    'film-strip-portal-27ea8315',
  ],
};

export function categoryFeaturedCovers(
  prompts: readonly PromptGalleryItem[],
  category: SubmitCategoryKey,
): string[] {
  const byId = new Map(prompts.map((item) => [item.id, item]));
  const covers: string[] = [];
  for (const id of CATEGORY_FEATURED_PROMPT_IDS[category]) {
    const item = byId.get(id);
    const cover = galleryCoverUrl(item?.images[0]);
    if (!item || !cover) continue;
    if (resolvePromptCategory(item.category, item.tags) !== category) continue;
    if (!covers.includes(cover)) covers.push(cover);
  }
  return covers;
}
