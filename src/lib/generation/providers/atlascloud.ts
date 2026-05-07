import type {
  GenerationCreateParams,
  GenerationCreateResult,
  GenerationPollResult,
  ImageGenerationProvider,
} from '~/lib/generation/types';

type AtlascloudCreateResponse = {
  id?: string;
  status?: string;
  data?: {
    id?: string;
    status?: string;
  };
};

type AtlascloudPollResponse = {
  status?: string;
  outputs?: string[];
  error?: unknown;
  data?: {
    id?: string;
    status?: string;
    outputs?: string[];
    error?: unknown;
    output?: unknown;
    images?: string[];
  };
};

function mapStatus(status?: string): GenerationPollResult['status'] {
  const s = (status || '').toLowerCase();
  if (s.includes('run') || s.includes('process') || s.includes('start')) return 'running';
  if (s.includes('succeed') || s.includes('success') || s === 'done') return 'succeeded';
  if (s.includes('complete')) return 'succeeded';
  if (s.includes('fail') || s.includes('error') || s.includes('cancel')) return 'failed';
  return 'queued';
}

export function createAtlascloudProvider(): ImageGenerationProvider {
  return createAtlascloudProviderWithOptions();
}

function pickAtlasSize(aspectRatio?: string): { width: number; height: number } | undefined {
  const ar = String(aspectRatio || '').trim();
  if (!ar) return undefined;
  const norm = ar.replace(/\s+/g, '');
  // AtlasCloud doc highlights common fixed sizes:
  // 1024×1024, 1024×1536, 1536×1024
  if (norm === '1:1' || norm === '1/1') return { width: 1024, height: 1024 };
  if (norm === '9:16' || norm === '2:3' || norm === '3:4') return { width: 1024, height: 1536 };
  if (norm === '16:9' || norm === '3:2' || norm === '4:3') return { width: 1536, height: 1024 };
  return undefined;
}

function coerceQuality(q?: string): 'low' | 'medium' | 'high' | undefined {
  const s = String(q || '').toLowerCase();
  if (!s) return undefined;
  if (s === 'low' || s === 'medium' || s === 'high') return s;
  // our UI uses "1k" by default
  if (s.includes('1k')) return 'medium';
  if (s.includes('2k') || s.includes('4k')) return 'high';
  return undefined;
}

export function createAtlascloudProviderWithOptions(opts?: { baseUrl?: string; apiKey?: string }): ImageGenerationProvider {
  const baseUrl = opts?.baseUrl ?? process.env.ATLASCLOUD_BASE_URL;
  const apiKey = opts?.apiKey ?? process.env.ATLASCLOUD_API_KEY;

  if (!baseUrl) throw new Error('Missing ATLASCLOUD_BASE_URL');
  if (!apiKey) throw new Error('Missing ATLASCLOUD_API_KEY');

  const base = baseUrl.replace(/\/+$/, '');
  // Accept multiple user-provided baseUrl styles:
  // - https://api.atlascloud.ai
  // - https://api.atlascloud.ai/api
  // - https://api.atlascloud.ai/api/v1/model
  const modelBase = /\/api\/v1\/model$/.test(base)
    ? base
    : /\/api$/.test(base)
      ? `${base}/v1/model`
      : `${base}/api/v1/model`;
  const createUrl = `${modelBase}/generateImage`;
  const pollUrlBase = `${modelBase}/prediction`;

  return {
    provider: 'atlascloud',
    async create(params: GenerationCreateParams): Promise<GenerationCreateResult> {
      const modelSlug =
        params.model && params.model.includes('/') ? params.model : 'openai/gpt-image-2/text-to-image';
      const size = pickAtlasSize(params.aspectRatio);
      const quality = coerceQuality(params.quality);

      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          // AtlasCloud docs show both `prompt` and `input.prompt` across examples.
          // Send both for compatibility.
          model: modelSlug,
          prompt: params.prompt,
          input: { prompt: params.prompt },
          ...(size ? size : {}),
          ...(quality ? { quality } : {}),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`atlascloud create failed: ${res.status} ${txt}`);
      }

      const json = (await res.json()) as AtlascloudCreateResponse;
      const id = json.data?.id || json.id;
      if (!id) throw new Error('atlascloud create: missing id');
      return { providerJobId: id, status: mapStatus(json.data?.status || json.status) };
    },
    async poll(providerJobId: string): Promise<GenerationPollResult> {
      const res = await fetch(`${pollUrlBase}/${providerJobId}`, {
        headers: { authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { providerJobId, status: 'failed', error: `atlascloud poll failed: ${res.status} ${txt}` };
      }
      const json = (await res.json()) as AtlascloudPollResponse;
      const status = mapStatus(json.data?.status || json.status);
      const outputs = json.data?.outputs || json.outputs;
      const images =
        status === 'succeeded'
          ? (Array.isArray(outputs) ? outputs : undefined) ||
            (Array.isArray((json.data as any)?.images) ? ((json.data as any).images as string[]) : undefined) ||
            (Array.isArray((json.data as any)?.output?.images) ? ((json.data as any).output.images as string[]) : undefined)
          : undefined;
      const error = status === 'failed' ? String(json.data?.error ?? json.error ?? 'failed') : undefined;
      return { providerJobId, status, images, error };
    },
  };
}

