export const MOTION_CATEGORY_IDS = ['product-brand', 'motion-studies', 'explainers-data', 'characters-stories', '3d-simulations', 'music-audiovisual', 'interactive'] as const;
export type MotionCategoryId = (typeof MOTION_CATEGORY_IDS)[number];
export type MotionSort = 'likes' | 'stars' | 'curated';
export type MotionPopularity = { likes: number | null; stars: number | null; observedAt: string | null; scope: 'post' | 'repository' | null; sourceUrl: string | null; approximate: boolean };
export type MotionSummary = {
  id: string; slug: string; title: string; author: string; model: string; type: string;
  category: MotionCategoryId; categories: string[]; sourceUrl: string; poster: string | null;
  video: string | null; previewVideo: string | null; width: number; height: number; popularity: MotionPopularity;
};
export type MotionDetail = MotionSummary & {
  prompt: string; promptSourceUrl: string; collectionUrl: string;
  requiresReference: boolean | null; skillUrl: string | null; promptStatus: string;
};
export type MotionPage = { items: MotionSummary[]; total: number; nextOffset: number | null };
export type MotionFacets = { total: number; models: Record<string, number>; categories: Record<string, number> };
