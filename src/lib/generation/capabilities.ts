export type ProviderCapabilities = {
  aspectRatios: string[];
  qualities: string[];
  maxCount: number;
  models?: { label: string; value?: string }[];
};

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  // "internal" means "use the server default provider".
  // We still expose a stable model list in the UI.
  internal: {
    aspectRatios: ['1:1', '2:1', '16:9', '3:2', '4:3', '5:4', '9:16', '3:4', '2:3', '4:5'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
    models: [
      { label: 'GPT Image 2', value: 'GPT Image 2' },
      { label: 'Nano Banana 2', value: 'openai/nano-banana-2/text-to-image' },
    ],
  },
  atlascloud: {
    aspectRatios: ['1:1', '2:1', '16:9', '3:2', '4:3', '5:4', '9:16', '3:4', '2:3', '4:5'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
    models: [
      { label: 'GPT Image 2', value: 'GPT Image 2' },
      // AtlasCloud expects a model slug for non-default models.
      { label: 'Nano Banana 2', value: 'openai/nano-banana-2/text-to-image' },
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

