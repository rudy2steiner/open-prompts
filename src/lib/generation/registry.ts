import type { ImageGenerationProvider } from '~/lib/generation/types';
import { createAtlascloudProvider } from '~/lib/generation/providers/atlascloud';
import { createReplicateProvider } from '~/lib/generation/providers/replicate';

let cached: Record<string, ImageGenerationProvider> | null = null;

export function getProviderRegistry(): Record<string, ImageGenerationProvider> {
  if (cached) return cached;
  const providers: Record<string, ImageGenerationProvider> = {};

  // instantiate lazily but at module load time for simplicity
  try {
    providers.atlascloud = createAtlascloudProvider();
  } catch {
    // optional in some envs
  }
  try {
    providers.replicate = createReplicateProvider();
  } catch {
    // optional in some envs
  }

  cached = providers;
  return providers;
}

export function getDefaultProviderName() {
  return process.env.DEFAULT_IMAGE_PROVIDER || 'atlascloud';
}

export function encodeProviderJobId(provider: string, providerJobId: string) {
  return `${provider}:${providerJobId}`;
}

export function decodeProviderJobId(encoded: string): { provider: string; providerJobId: string } {
  const idx = encoded.indexOf(':');
  if (idx <= 0) return { provider: getDefaultProviderName(), providerJobId: encoded };
  return { provider: encoded.slice(0, idx), providerJobId: encoded.slice(idx + 1) };
}

