import { getProviderRegistry, getDefaultProviderName, encodeProviderJobId } from '~/lib/generation/registry';
import type { GenerationCreateParams } from '~/lib/generation/types';
import { createAtlascloudProviderWithOptions } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';

export async function POST(req: Request) {
  const useTestMode = String(process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
  const testImageUrl = String(process.env.TEST_IMAGE_URL || '').trim();

  const json = (await req.json().catch(() => ({}))) as Partial<GenerationCreateParams> & {
    provider?: string;
    apiKey?: string;
  };

  const prompt = String(json.prompt || '').trim();
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (useTestMode) {
    const id =
      // Node 18+ / modern runtimes
      (globalThis as any).crypto?.randomUUID?.() ||
      `test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    return new Response(
      JSON.stringify({
        provider: 'test',
        providerJobId: encodeProviderJobId('test', id),
        // Let the client polling path populate images.
        status: 'queued',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }

  const providerName = (json.provider || getDefaultProviderName()).toLowerCase();
  const apiKey = typeof json.apiKey === 'string' ? json.apiKey.trim() : '';
  const provider =
    apiKey && providerName === 'atlascloud'
      ? createAtlascloudProviderWithOptions({ apiKey })
      : apiKey && providerName === 'replicate'
        ? createReplicateProviderWithOptions({ token: apiKey })
        : getProviderRegistry()[providerName];
  if (!provider) {
    return new Response(JSON.stringify({ error: `Unknown provider: ${providerName}` }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const result = await provider.create({
      prompt,
      negativePrompt: json.negativePrompt,
      model: json.model,
      aspectRatio: json.aspectRatio,
      quality: json.quality,
      count: json.count,
    });
    return new Response(
      JSON.stringify({
        provider: providerName,
        providerJobId: encodeProviderJobId(providerName, result.providerJobId),
        status: result.status,
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'create failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

