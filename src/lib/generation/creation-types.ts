import type { PromptGalleryItem } from '~/data/promptGallery';
import { buildLocaleHref } from '~/lib/op-locale';
import { CREATION_SHOWCASE_MEDIA, resolveCreationShowcaseMedia } from './creation-showcase-media';

export type CreateImageMode = 'text' | 'reference' | 'edit';

export const CREATION_TYPES = [
  { slug: 'text-to-image', mode: 'text', key: 'textToImage', creditKey: 'text' },
  { slug: 'reference-to-image', mode: 'reference', key: 'referenceToImage', creditKey: 'reference' },
  { slug: 'image-edit', mode: 'edit', key: 'imageEdit', creditKey: 'edit' },
] as const;

export type CreationType = (typeof CREATION_TYPES)[number];
export type CreationTypeSlug = CreationType['slug'];

export function resolveCreationType(slug: string): CreationType | undefined {
  return CREATION_TYPES.find((type) => type.slug === slug);
}

export function parseCreateImageMode(value: string | null | undefined): CreateImageMode | null {
  const type = CREATION_TYPES.find((item) => item.mode === value || item.slug === value);
  return type?.mode ?? null;
}

export function creationTypePath(slug: CreationTypeSlug): string {
  return `/${slug}`;
}

export function creationTypeHref(locale: string, slug: CreationTypeSlug): string {
  return buildLocaleHref(locale, creationTypePath(slug));
}

export function createWithModeHref(locale: string, mode: CreateImageMode, templateId?: string, demo?: 'site'): string {
  const params = new URLSearchParams({ mode });
  if (templateId) params.set('template', templateId);
  if (demo) params.set('demo', demo);
  return `${buildLocaleHref(locale, '/create')}?${params.toString()}`;
}

const IMAGE_INPUT_PATTERN =
  /\b(uploaded|upload|reference (image|photo)|provided (image|photo)|input (image|photo)|attached (image|photo)|this (photo|image|picture|selfie)|my (photo|selfie|picture)|the (photo|image) (provided|above))\b/i;
const EDIT_PATTERN =
  /\b(replace|remove|change (the|its|her|his)|edit|retouch|restyle|recolor|turn (this|the|my)|transform (this|the|my)|keep (the|her|his|its))\b/i;

export function promptUsesInputImage(prompt: string): boolean {
  return IMAGE_INPUT_PATTERN.test(prompt);
}

type ShowcaseCapability = { key: string; pattern: RegExp; preferredId?: string };

const QUOTED_CJK_PATTERN = /["“「『'][^"”」』'\n]{0,40}[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

export const CREATION_TYPE_SHOWCASE: Record<CreateImageMode, readonly ShowcaseCapability[]> = {
  text: [
    { key: 'photoreal', pattern: /\b(photorealistic|hyper-?realistic|photograph(y)?|35mm|dslr|film grain|candid|shot on)\b/gi },
    { key: 'typography', pattern: /\b(poster|typography|headline|lettering|title text|bold text|text reads|wordmark)\b/gi },
    { key: 'multilingual', pattern: /\b(chinese|japanese|korean|kanji|hanzi|hangul|calligraphy|characters)\b/gi },
    { key: 'infographic', pattern: /\b(infographic|diagram|chart|cheat ?sheet|timeline|explainer|labeled|annotations?|callouts?)\b/gi },
    { key: 'ui', pattern: /\b(ui|ux|app screen|app interface|dashboard|landing page|web ?site|screenshot|wireframe)\b/gi },
    { key: 'product', pattern: /\b(product shot|product photo(graphy)?|packaging|bottle|e-?commerce|commercial|advertis(ement|ing))\b/gi },
  ],
  reference: [
    { key: 'character', preferredId: 'ai-generated-character-reference-sheet-86', pattern: /\b(character (reference )?sheet|same (character|person|face)|consisten(t|cy)|turnaround|multiple (poses|angles)|identity)\b/gi },
    { key: 'portrait', preferredId: 'vintage-photo-restoration-a36b15f4', pattern: /\b(selfie|portrait|headshot|avatar|profile (photo|picture)|face)\b/gi },
    { key: 'style', pattern: /\b(in the style of|style transfer|watercolou?r|anime|ghibli|pixar|illustration|hand-drawn|vector)\b/gi },
    { key: 'series', preferredId: 'travel-field-notes-458ca2b0', pattern: /\b(comic|storyboard|panels?|series|each uploaded|per photo|collection|set of)\b/gi },
    { key: 'productScene', preferredId: 'professional-food-photogr-80786513', pattern: /\b(product|packaging|brand|lifestyle|campaign|advert)\b/gi },
    { key: 'figure', preferredId: 'custom-minifigure-set-16b6425d', pattern: /\b(figurine|action figure|toy|collectible|chibi|miniature|sculpture|3d)\b/gi },
  ],
  edit: [
    { key: 'toy', pattern: /\b(minifigures?|lego|toys?|figurines?|plush|claymation|collectible)\b/gi },
    { key: 'restyle', pattern: /\b(transform|turn (this|the|my|it) into|convert|restyle|reimagine|redraw|vector|illustration)\b/gi },
    { key: 'poster', pattern: /\b(poster|cover|magazine|thumbnail|banner|layout)\b/gi },
    { key: 'swap', pattern: /\b(swap|replac(e|ing)|insert|identity replacement|face swap)\b/gi },
    { key: 'outfit', pattern: /\b(outfit|clothes|clothing|wardrobe|wearing|hair ?style|makeup|costume|fashion)\b/gi },
    { key: 'retouch', pattern: /\b(retouch|remove|clean ?up|enhance|restore|relight|lighting|colou?r grad(e|ing)|cinematic)\b/gi },
  ],
};

export type ShowcaseItem = { capability: string; prompt: PromptGalleryItem };

const CREATION_TYPE_LANDING_EXAMPLES: Record<CreateImageMode, {
  hero: string;
  showcase: readonly { capability: string; id: string }[];
}> = {
  text: {
    hero: 'candid-street-fashion-4e88f95c',
    showcase: [
      { capability: 'photoreal', id: 'candid-park-portrait-c0cdb8a7' },
      { capability: 'typography', id: 'raised-city-diorama-5f1ba47b' },
      { capability: 'multilingual', id: 'japanese-bookstore-oni-ta-0974b179' },
      { capability: 'infographic', id: 'wildlife-infographic-image-created-using-gpt-image-7423ba5d' },
      { capability: 'ui', id: 'social-media-content-inte-1d046dc1' },
      { capability: 'product', id: 'break-the-ice-cola-b47aa197' },
    ],
  },
  reference: {
    hero: 'watercolor-photo-vignette-76967165',
    showcase: [
      { capability: 'character', id: 'countryside-film-collage-2a70f109' },
      { capability: 'style', id: 'hand-drawn-travel-journal-57d01f1b' },
      { capability: 'series', id: 'travel-field-notes-458ca2b0' },
      { capability: 'productScene', id: 'gpt-image-2-on-chatgpt-f7a4c7af' },
      { capability: 'figure', id: 'custom-minifigure-set-16b6425d' },
    ],
  },
  edit: {
    hero: 'vintage-photo-restoration-a36b15f4',
    showcase: [{ capability: 'retouch', id: 'professional-beverage-pho-a092d406' }],
  },
};

export function pickCreationTypeLandingExamples(prompts: PromptGalleryItem[], mode: CreateImageMode): {
  hero: PromptGalleryItem | undefined;
  showcase: ShowcaseItem[];
} {
  const byId = new Map(prompts.filter(prompt => prompt.images[0] && prompt.prompt.trim()).map(prompt => [prompt.id, prompt]));
  const selection = CREATION_TYPE_LANDING_EXAMPLES[mode];
  return {
    hero: byId.get(selection.hero),
    showcase: selection.showcase.flatMap(({ capability, id }) => {
      const prompt = byId.get(id);
      return prompt ? [{ capability, prompt }] : [];
    }),
  };
}

export function pickCreationTypeInspiration(prompts: PromptGalleryItem[], mode: CreateImageMode): PromptGalleryItem[] {
  const { hero, showcase } = pickCreationTypeLandingExamples(prompts, mode);
  return [...(hero ? [hero] : []), ...showcase.map(({ prompt }) => prompt)].map(prompt => {
    const verified = CREATION_SHOWCASE_MEDIA[prompt.id];
    const demo = mode === 'reference' ? verified?.siteDemo : undefined;
    const media = resolveCreationShowcaseMedia(demo?.outputs ?? prompt.images, demo ?? verified);
    return {
      ...prompt,
      images: media.outputs.length ? media.outputs : prompt.images,
      prompt: demo?.prompt ?? prompt.prompt,
      model: demo?.model ?? prompt.model,
    };
  });
}

function countMatches(pattern: RegExp, text: string): number {
  return text.match(pattern)?.length ?? 0;
}

function showcaseScore(p: PromptGalleryItem, mode: CreateImageMode, capability: ShowcaseCapability): number {
  const meta = `${p.title}\n${p.description}\n${p.tags.join(' ')}`;
  const metaHits = countMatches(capability.pattern, meta);
  const promptHits = countMatches(capability.pattern, p.prompt);
  if (capability.key === 'multilingual' && !QUOTED_CJK_PATTERN.test(p.prompt)) return 0;
  if (!metaHits && !promptHits) return 0;
  let score = Math.min(metaHits, 2) * 3 + Math.min(promptHits, 4);
  const usesImage = promptUsesInputImage(p.prompt);
  if (mode === 'text') {
    if (usesImage) return 0;
  } else {
    if (!usesImage) return 0;
    const isEdit = EDIT_PATTERN.test(p.prompt);
    if (mode === 'edit' ? isEdit : !isEdit) score += 2;
  }
  return score;
}

/** One distinct site template per capability; reference and edit only use templates written for an input image. */
export function pickCreationTypeShowcase(prompts: PromptGalleryItem[], mode: CreateImageMode): ShowcaseItem[] {
  const pool = prompts.filter((p) => p.images[0] && p.prompt.trim());
  const preferredIds = new Set(CREATION_TYPE_SHOWCASE[mode].map((capability) => capability.preferredId));
  const used = new Set<string>();
  const items: ShowcaseItem[] = [];
  for (const capability of CREATION_TYPE_SHOWCASE[mode]) {
    let best: PromptGalleryItem | undefined;
    let bestScore = 0;
    for (const p of pool) {
      if (used.has(p.id) || (preferredIds.has(p.id) && p.id !== capability.preferredId)) continue;
      if (p.id === capability.preferredId) {
        best = p;
        break;
      }
      const score = showcaseScore(p, mode, capability);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    if (best) {
      used.add(best.id);
      items.push({ capability: capability.key, prompt: best });
    }
  }
  return items;
}

/** Gallery prompts that fit the creation type; reference and edit only return prompts written for an input image. */
export function pickCreationTypeExamples(
  prompts: PromptGalleryItem[],
  mode: CreateImageMode,
  limit: number,
): PromptGalleryItem[] {
  const withImages = prompts.filter((p) => p.images[0] && p.prompt.trim());
  if (mode === 'text') return withImages.filter((p) => !promptUsesInputImage(p.prompt)).slice(0, limit);
  const imagePrompts = withImages.filter((p) => promptUsesInputImage(p.prompt));
  const edits = imagePrompts.filter((p) => EDIT_PATTERN.test(p.prompt));
  const references = imagePrompts.filter((p) => !EDIT_PATTERN.test(p.prompt));
  return (mode === 'edit' ? [...edits, ...references] : [...references, ...edits]).slice(0, limit);
}
