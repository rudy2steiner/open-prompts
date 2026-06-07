/** Primary style categories — stored in `p_prompts.category` on submit. */
export const SUBMIT_CATEGORY_KEYS = [
  'artStyles',
  'portraitPhoto',
  'designUi',
  'gameFantasy',
  'scenes',
  'productCommercial',
  'styleEra',
] as const;

export type SubmitCategoryKey = (typeof SUBMIT_CATEGORY_KEYS)[number];

/** Legacy category keys (pre-7-tier taxonomy). */
export const LEGACY_SUBMIT_CATEGORY_KEYS = [
  'landscape',
  'portrait',
  'architecture',
  'animal',
  'illustration',
  'realism',
  'game',
  'cinematic',
  'scifi',
  'abstract',
] as const;

export type LegacySubmitCategoryKey = (typeof LEGACY_SUBMIT_CATEGORY_KEYS)[number];

export const LEGACY_CATEGORY_MAP: Record<LegacySubmitCategoryKey, SubmitCategoryKey> = {
  landscape: 'scenes',
  portrait: 'portraitPhoto',
  architecture: 'designUi',
  animal: 'scenes',
  illustration: 'artStyles',
  realism: 'portraitPhoto',
  game: 'gameFantasy',
  cinematic: 'scenes',
  scifi: 'gameFantasy',
  abstract: 'styleEra',
};

export const SUBMIT_CATEGORY_EMOJI: Record<SubmitCategoryKey, string> = {
  artStyles: '🎨',
  portraitPhoto: '📸',
  designUi: '🖥️',
  gameFantasy: '🎮',
  scenes: '🌅',
  productCommercial: '🛍️',
  styleEra: '✨',
};

/** Suggested quick tags on the submit form (also used as gallery sub-tag seeds). */
export const SUBMIT_QUICK_TAGS = [
  'Illustration',
  'Portrait',
  'Photorealistic',
  'Fantasy',
  'Cinematic',
  'Editorial',
  'Anime',
  'Vintage',
] as const;

/** Per-category tag suggestions (submit quick picks + gallery sub-tags). */
export const SUBMIT_CATEGORY_TAGS: Record<SubmitCategoryKey, readonly string[]> = {
  artStyles: [
    'Illustration',
    'Concept Art',
    'Anime',
    'Manga',
    'Watercolor',
    'Sketch',
    'Surrealism',
    'Minimalism',
    'Chinese Painting',
    'Storybook',
    'Graphic Novel',
  ],
  portraitPhoto: [
    'Portrait',
    'Fashion Photography',
    'Fashion Model',
    'Photorealistic',
    'Editorial',
    'Documentary Photography',
  ],
  designUi: ['UI', 'App UI', 'Poster', 'Flyer', 'Magazine Cover', 'Diagram', 'Storyboard', 'Architecture', 'Web Design'],
  gameFantasy: ['Game Asset', 'Fantasy', 'Character Design', 'Sci-Fi', 'Alien'],
  scenes: ['Landscape', 'Cityscape', 'Cinematic', 'Environment'],
  productCommercial: ['Product', 'Commercial', 'E-commerce Banner', 'Brand'],
  styleEra: ['Vintage', 'Monochrome', 'Retro', 'Film', 'Abstract', 'Editorial'],
};

export function isSubmitCategoryKey(raw: string): raw is SubmitCategoryKey {
  return (SUBMIT_CATEGORY_KEYS as readonly string[]).includes(raw);
}

export function normalizeSubmitCategoryKey(raw: string): SubmitCategoryKey | null {
  if (isSubmitCategoryKey(raw)) return raw;
  if ((LEGACY_SUBMIT_CATEGORY_KEYS as readonly string[]).includes(raw)) {
    return LEGACY_CATEGORY_MAP[raw as LegacySubmitCategoryKey];
  }
  return null;
}

export function getSubmitCategoryTags(category: SubmitCategoryKey): string[] {
  return [...SUBMIT_CATEGORY_TAGS[category]];
}

function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Case-insensitive match; also matches partials (e.g. sub-tag "UI" ↔ prompt tag "App UI"). */
export function tagMatchesSubTag(tag: string, subTag: string): boolean {
  const hay = normalizeTag(tag);
  const needle = normalizeTag(subTag);
  if (!needle || !hay) return false;
  return hay === needle || hay.includes(needle) || needle.includes(hay);
}

function promptHasSubTag(tags: readonly string[], subTag: string): boolean {
  return tags.some((tag) => tagMatchesSubTag(tag, subTag));
}

/** Infer category when `category` column is empty (e.g. bundled import JSON). */
export function inferPromptCategoryFromTags(tags: readonly string[]): SubmitCategoryKey | null {
  for (const cat of SUBMIT_CATEGORY_KEYS) {
    for (const tag of tags) {
      if (normalizeSubmitCategoryKey(tag)) continue;
      for (const sub of SUBMIT_CATEGORY_TAGS[cat]) {
        if (tagMatchesSubTag(tag, sub)) return cat;
      }
    }
  }
  return null;
}

/** Prefer `category` column; fall back to category key in tags; then infer from sub-tags. */
export function resolvePromptCategory(
  category: string | null | undefined,
  tags: readonly string[],
): SubmitCategoryKey | null {
  if (category) {
    const normalized = normalizeSubmitCategoryKey(category);
    if (normalized) return normalized;
  }
  for (const tag of tags) {
    const normalized = normalizeSubmitCategoryKey(tag);
    if (normalized) return normalized;
  }
  return inferPromptCategoryFromTags(tags);
}

/** Tags for gallery row 3: submit suggestions + tags seen on prompts in this category. */
export function mergeCategoryTags(
  category: SubmitCategoryKey,
  prompts: readonly { category?: string | null; tags: readonly string[] }[],
  maxDynamic = 12,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of getSubmitCategoryTags(category)) {
    if (!seen.has(tag)) {
      seen.add(tag);
      out.push(tag);
    }
  }

  for (const item of prompts) {
    if (resolvePromptCategory(item.category, item.tags) !== category) continue;
    for (const tag of item.tags) {
      if (normalizeSubmitCategoryKey(tag) || seen.has(tag)) continue;
      seen.add(tag);
      out.push(tag);
      if (out.length >= getSubmitCategoryTags(category).length + maxDynamic) return out;
    }
  }

  return out;
}

export function promptMatchesGalleryFilter(
  item: { category?: string | null; tags: readonly string[] },
  category: 'all' | SubmitCategoryKey,
  subTag: string | null,
): boolean {
  const itemCategory = resolvePromptCategory(item.category, item.tags);
  if (category !== 'all' && itemCategory !== category) return false;
  if (category !== 'all' && subTag) {
    return promptHasSubTag(item.tags, subTag);
  }
  return true;
}
