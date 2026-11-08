import type {
  GenerationCreateParams,
  GenerationCreateResult,
  GenerationPollResult,
  ImageGenerationProvider,
  ImageResolution,
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

const ATLAS_BASE_SIZES: Record<string, [number, number]> = {
  '1:1': [1024, 1024],
  '2:1': [1536, 768],
  '16:9': [1536, 864],
  '3:2': [1536, 1024],
  '4:3': [1024, 768],
  '5:4': [1280, 1024],
  '9:16': [864, 1536],
  '3:4': [768, 1024],
  '2:3': [1024, 1536],
  '4:5': [1024, 1280],
};

export function pickAtlasSize(aspectRatio?: string, resolution: string = '1k'): { width: number; height: number } | undefined {
  if (aspectRatio !== undefined && typeof aspectRatio !== 'string') return undefined;
  const ratio = (aspectRatio ?? '1:1').trim().replace(/\s+/g, '').replace('/', ':');
  if (!Object.hasOwn(ATLAS_BASE_SIZES, ratio)) return undefined;
  const base = ATLAS_BASE_SIZES[ratio];
  if (resolution === '1k') return { width: base[0], height: base[1] };
  if (resolution === '2k') {
    const scale = 2048 / Math.max(...base);
    return { width: Math.round(base[0] * scale / 16) * 16, height: Math.round(base[1] * scale / 16) * 16 };
  }
  if (resolution === '4k' && ratio === '16:9') return { width: 3840, height: 2160 };
  if (resolution === '4k' && ratio === '9:16') return { width: 2160, height: 3840 };
  return undefined;
}

export function resolutionForAtlasSize(width: number, height: number): ImageResolution | null {
  for (const resolution of ['1k', '2k', '4k'] as const) {
    for (const ratio of Object.keys(ATLAS_BASE_SIZES)) {
      const size = pickAtlasSize(ratio, resolution);
      if (size?.width === width && size.height === height) return resolution;
    }
  }
  return null;
}

function coerceQuality(q?: string): 'low' | 'medium' | 'high' | undefined {
  const s = String(q || '').toLowerCase();
  if (s === 'low' || s === '1k') return 'low';
  if (s === 'medium' || s === '2k') return 'medium';
  if (s === 'high' || s === '4k') return 'high';
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
      const size = pickAtlasSize(params.aspectRatio, params.resolution);
      if (!size) throw new Error('Unsupported AtlasCloud size or resolution');
      const quality = coerceQuality(params.quality);
      const count = params.count === undefined ? 1 : params.count;
      if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Unsupported AtlasCloud image count');

      const startedAt = Date.now();
      console.info('[op:provider:atlascloud:create:start]', {
        model: modelSlug,
        aspectRatio: params.aspectRatio,
        quality: params.quality,
        pickedSize: size || null,
      });
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelSlug,
          prompt: params.prompt,
          ...(params.referenceImages?.length ? { images: params.referenceImages } : {}),
          size: `${size.width}x${size.height}`,
          n: count,
          ...(quality ? { quality } : {}),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[op:provider:atlascloud:create:error]', {
          status: res.status,
          elapsedMs: Date.now() - startedAt,
          bodyPreview: txt.slice(0, 800),
        });
        throw new Error(`atlascloud create failed: ${res.status} ${txt}`);
      }

      const json = (await res.json()) as AtlascloudCreateResponse;
      const id = json.data?.id || json.id;
      if (!id) throw new Error('atlascloud create: missing id');
      console.info('[op:provider:atlascloud:create:done]', {
        status: json.data?.status || json.status,
        providerJobId: id,
        elapsedMs: Date.now() - startedAt,
      });
      return { providerJobId: id, status: mapStatus(json.data?.status || json.status) };
    },
    async poll(providerJobId: string): Promise<GenerationPollResult> {
      const startedAt = Date.now();
      const res = await fetch(`${pollUrlBase}/${providerJobId}`, {
        headers: { authorization: `Bearer ${apiKey}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[op:provider:atlascloud:poll:error]', {
          providerJobId,
          status: res.status,
          elapsedMs: Date.now() - startedAt,
          bodyPreview: txt.slice(0, 800),
        });
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
      console.info('[op:provider:atlascloud:poll:done]', {
        providerJobId,
        rawStatus: json.data?.status || json.status,
        status,
        images: Array.isArray(images) ? images.length : 0,
        hasError: Boolean(error),
        elapsedMs: Date.now() - startedAt,
      });
      return { providerJobId, status, images, error };
    },
  };
}

