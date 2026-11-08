import { resolutionForAtlasSize } from '../generation/providers/atlascloud';

export type ImagePath = 'text-to-image' | 'reference' | 'edit';

const GPT_IMAGE_RATES = [
  { label: 'GPT Image 2', base: 'openai/gpt-image-2', multiplier: 1 },
  { label: 'GPT Image 2.5 Sunburst', base: 'openai/gpt-image-2.5-sunburst', multiplier: 1 },
  { label: 'GPT Image 2.5 Flare', base: 'openai/gpt-image-2.5-flare', multiplier: 0.5 },
  { label: 'GPT Image 2.6 Sunburst', base: 'openai/gpt-image-2.6-sunburst', multiplier: 1.5 },
  { label: 'GPT Image 2.6 Flare', base: 'openai/gpt-image-2.6-flare', multiplier: 0.75 },
];
const QUALITY_MULTIPLIERS = { low: 1, medium: 3, high: 12 };
const RESOLUTION_MULTIPLIERS = { '1k': 1, '2k': 2, '4k': 4 };

const FAMILIES: Array<{ pattern: RegExp; base: string }> = [
  { pattern: /nano[- ]banana[- ]?2/, base: 'google/nano-banana-2' },
  { pattern: /2\.6[- ]flare|gpt-image-2\.6-flare/, base: 'openai/gpt-image-2.6-flare' },
  { pattern: /2\.6[- ]sunburst|gpt-image-2\.6-sunburst/, base: 'openai/gpt-image-2.6-sunburst' },
  { pattern: /2\.5[- ]flare|gpt-image-2\.5-flare/, base: 'openai/gpt-image-2.5-flare' },
  { pattern: /2\.5[- ]sunburst|gpt-image-2\.5-sunburst/, base: 'openai/gpt-image-2.5-sunburst' },
  { pattern: /gpt[- ]image[- ]2(?!\.)|gpt-image-2(?![.\d])/, base: 'openai/gpt-image-2' },
];

export const SITE_IMAGE_MODELS = [
  { label: 'GPT Image 2', value: 'GPT Image 2' },
  { label: 'GPT Image 2.5 Sunburst', value: 'GPT Image 2.5 Sunburst' },
  { label: 'GPT Image 2.5 Flare', value: 'GPT Image 2.5 Flare' },
  { label: 'GPT Image 2.6 Sunburst', value: 'GPT Image 2.6 Sunburst' },
  { label: 'GPT Image 2.6 Flare', value: 'GPT Image 2.6 Flare' },
  { label: 'Nano Banana 2', value: 'Nano Banana 2' },
];

export function atlasQuality(quality?: string): 'low' | 'medium' | 'high' | null {
  const value = String(quality || '').toLowerCase();
  if (value === 'low' || value === '1k') return 'low';
  if (value === 'medium' || value === '2k') return 'medium';
  if (value === 'high' || value === '4k') return 'high';
  return null;
}

export function atlasModelSlug(model: string, path: ImagePath): string | null {
  const normalized = model.trim().toLowerCase();
  const family = FAMILIES.find((item) => item.pattern.test(normalized));
  if (!family) return null;
  const endpoint = path === 'text-to-image' ? 'text-to-image' : 'edit';
  return `${family.base}/${endpoint}`;
}

export function quoteImageCredits(input: {
  model: string;
  path: ImagePath;
  quality?: string;
  width?: number;
  height?: number;
  count: number;
}): { slug: string; credits: number } | null {
  if (!['text-to-image', 'reference', 'edit'].includes(input.path) || typeof input.model !== 'string') return null;
  const model = input.model.trim().toLowerCase();
  const rate = GPT_IMAGE_RATES.find(({ label, base }) =>
    model === label.toLowerCase() || model === `${base}/text-to-image` || model === `${base}/edit`);
  const count = input.count;
  if (!rate || !Number.isInteger(count) || count < 1 || count > 4 || typeof input.quality !== 'string') return null;
  const quality = atlasQuality(input.quality);
  if (!quality || typeof input.width !== 'number' || typeof input.height !== 'number') return null;
  const resolution = resolutionForAtlasSize(input.width, input.height);
  if (!resolution) return null;
  const slug = atlasModelSlug(input.model, input.path)!;
  const perImage = Math.max(2, Math.ceil(2 * rate.multiplier * QUALITY_MULTIPLIERS[quality] * RESOLUTION_MULTIPLIERS[resolution]));
  return { slug, credits: perImage * count };
}

export function imagesFromCredits(credits: number, perImage: number): number {
  return Math.floor(credits / perImage);
}

export function packImageCounts(credits: number): { nanoBanana: number; flareEdit: number; gptImage2: number } {
  return {
    nanoBanana: imagesFromCredits(credits, 1),
    flareEdit: imagesFromCredits(credits, 2),
    gptImage2: imagesFromCredits(credits, 6),
  };
}

/** 套餐卡只展示大约张数，按常见的 2 积分一张估算并取整到十位。 */
export function approximateImageCount(credits: number): number {
  return Math.round(imagesFromCredits(credits, 2) / 10) * 10;
}

export const STARTER_CREDIT_MATRIX: Array<{ model: string; text: number; reference: number; edit: number }> = [
  ...GPT_IMAGE_RATES.map(({ label }) => {
    const credits = quoteImageCredits({ model: label, path: 'text-to-image', quality: 'low', width: 1024, height: 1024, count: 1 })!.credits;
    return { model: label, text: credits, reference: credits, edit: credits };
  }),
  { model: 'Nano Banana 2', text: 4, reference: 4, edit: 4 },
];
