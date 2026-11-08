import { atlasModelSlug } from '~/lib/billing/quotes';
import type { ImageResolution } from '~/lib/generation/types';

export const IMAGE_RESOLUTIONS: ImageResolution[] = ['1k', '2k', '4k'];

const REFERENCE_IMAGE_LIMITS: Record<string, number> = {
  'openai/gpt-image-2.6-sunburst/edit': 16,
  'openai/gpt-image-2.6-flare/edit': 16,
  'openai/gpt-image-2.5-sunburst/edit': 16,
  'openai/gpt-image-2.5-flare/edit': 16,
  'openai/gpt-image-2/edit': 10,
  'google/nano-banana-2/edit': 14,
};

export function isModelComingSoon(model: string): boolean {
  return atlasModelSlug(model, 'edit') === 'google/nano-banana-2/edit';
}

export function referenceImageLimit(model: string): number | null {
  const slug = atlasModelSlug(model, 'edit');
  return slug ? REFERENCE_IMAGE_LIMITS[slug] ?? null : null;
}

export type ProviderCapabilities = {
  aspectRatios: string[];
  qualities: string[];
  maxCount: number;
  models?: { label: string; value?: string }[];
};

export function modelDisplayLabel(
  label: string,
  translate: (key: 'gen.modelDetailed' | 'gen.modelFast' | 'gen.modelDefault') => string,
): string {
  if (label === 'Default') return translate('gen.modelDefault');
  const variant = /^(GPT Image \d+(?:\.\d+)?) (Sunburst|Flare)$/.exec(label);
  if (!variant) return label;
  return `${variant[1]} · ${translate(variant[2] === 'Sunburst' ? 'gen.modelDetailed' : 'gen.modelFast')}`;
}

const QUALITY_LABEL_KEYS = { '1k': 'gen.qualityLow', '2k': 'gen.qualityMedium', '4k': 'gen.qualityHigh' } as const;

export function qualityDisplayLabel(
  quality: string,
  translate: (key: (typeof QUALITY_LABEL_KEYS)[keyof typeof QUALITY_LABEL_KEYS]) => string,
): string {
  const key = QUALITY_LABEL_KEYS[quality as keyof typeof QUALITY_LABEL_KEYS];
  return key ? translate(key) : quality;
}

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  // "internal" means "use the server default provider".
  // We still expose a stable model list in the UI.
  internal: {
    aspectRatios: ['1:1', '2:1', '16:9', '3:2', '4:3', '5:4', '9:16', '3:4', '2:3', '4:5'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
    models: [
      { label: 'GPT Image 2.6 Sunburst', value: 'GPT Image 2.6 Sunburst' },
      { label: 'GPT Image 2.6 Flare', value: 'GPT Image 2.6 Flare' },
      { label: 'GPT Image 2.5 Sunburst', value: 'GPT Image 2.5 Sunburst' },
      { label: 'GPT Image 2.5 Flare', value: 'GPT Image 2.5 Flare' },
      { label: 'GPT Image 2', value: 'GPT Image 2' },
      { label: 'Nano Banana 2', value: 'Nano Banana 2' },
    ],
  },
  atlascloud: {
    aspectRatios: ['1:1', '2:1', '16:9', '3:2', '4:3', '5:4', '9:16', '3:4', '2:3', '4:5'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
    models: [
      { label: 'GPT Image 2.6 Sunburst', value: 'GPT Image 2.6 Sunburst' },
      { label: 'GPT Image 2.6 Flare', value: 'GPT Image 2.6 Flare' },
      { label: 'GPT Image 2.5 Sunburst', value: 'GPT Image 2.5 Sunburst' },
      { label: 'GPT Image 2.5 Flare', value: 'GPT Image 2.5 Flare' },
      { label: 'GPT Image 2', value: 'GPT Image 2' },
      { label: 'Nano Banana 2', value: 'Nano Banana 2' },
    ],
  },
  replicate: {
    aspectRatios: ['1:1', '2:1', '16:9', '3:2', '4:3', '5:4', '9:16', '3:4', '2:3', '4:5'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
    // Replicate model selection is currently controlled by server env (REPLICATE_MODEL / REPLICATE_VERSION).
    models: [{ label: 'Default', value: 'Default' }],
  },
};

