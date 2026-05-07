export type ProviderCapabilities = {
  aspectRatios: string[];
  qualities: string[];
  maxCount: number;
};

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
  atlascloud: {
    aspectRatios: ['1:1', '4:3', '16:9', '9:16'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
  },
  replicate: {
    aspectRatios: ['1:1', '4:3', '16:9', '9:16'],
    qualities: ['1k', '2k', '4k'],
    maxCount: 4,
  },
};

