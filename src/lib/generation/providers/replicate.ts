import type {
  GenerationCreateParams,
  GenerationCreateResult,
  GenerationPollResult,
  ImageGenerationProvider,
} from '~/lib/generation/types';

type ReplicatePrediction = {
  id: string;
  status: string;
  error?: unknown;
  output?: unknown;
};

function mapStatus(status: string): GenerationPollResult['status'] {
  if (status === 'starting' || status === 'processing') return 'running';
  if (status === 'succeeded') return 'succeeded';
  if (status === 'failed' || status === 'canceled') return 'failed';
  return 'queued';
}

function coerceImages(output: unknown): string[] | undefined {
  if (Array.isArray(output)) {
    const urls = output.filter((v) => typeof v === 'string') as string[];
    return urls.length ? urls : undefined;
  }
  if (typeof output === 'string') return [output];
  if (output && typeof output === 'object') {
    // some models return { images: [...] }
    const images = (output as any).images;
    if (Array.isArray(images)) return images.filter((v: any) => typeof v === 'string');
  }
  return undefined;
}

export function createReplicateProvider(): ImageGenerationProvider {
  return createReplicateProviderWithOptions();
}

export function createReplicateProviderWithOptions(opts?: {
  token?: string;
  model?: string;
  version?: string;
}): ImageGenerationProvider {
  const token = opts?.token ?? process.env.REPLICATE_API_TOKEN;
  const model = opts?.model ?? process.env.REPLICATE_MODEL; // e.g. "black-forest-labs/flux-schnell"
  const version = opts?.version ?? process.env.REPLICATE_VERSION; // optional

  if (!token) {
    throw new Error('Missing REPLICATE_API_TOKEN');
  }
  if (!model && !version) {
    throw new Error('Missing REPLICATE_MODEL or REPLICATE_VERSION');
  }

  return {
    provider: 'replicate',
    async create(params: GenerationCreateParams): Promise<GenerationCreateResult> {
      const body: any = {
        input: {
          prompt: params.prompt,
        },
      };
      if (params.negativePrompt) body.input.negative_prompt = params.negativePrompt;
      if (params.aspectRatio) body.input.aspect_ratio = params.aspectRatio;
      if (params.quality) body.input.quality = params.quality;
      if (params.count) body.input.num_outputs = params.count;

      if (version) body.version = version;
      else body.model = model;

      const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Replicate create failed: ${res.status} ${txt}`);
      }

      const json = (await res.json()) as ReplicatePrediction;
      return { providerJobId: json.id, status: mapStatus(json.status) };
    },
    async poll(providerJobId: string): Promise<GenerationPollResult> {
      const res = await fetch(`https://api.replicate.com/v1/predictions/${providerJobId}`, {
        headers: { authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { providerJobId, status: 'failed', error: `Replicate poll failed: ${res.status} ${txt}` };
      }

      const json = (await res.json()) as ReplicatePrediction;
      const status = mapStatus(json.status);
      const images = status === 'succeeded' ? coerceImages(json.output) : undefined;
      const error = status === 'failed' ? String(json.error ?? 'failed') : undefined;
      return { providerJobId, status, images, error };
    },
  };
}

