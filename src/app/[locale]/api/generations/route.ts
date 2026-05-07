import { getProviderRegistry, getDefaultProviderName, encodeProviderJobId } from '~/lib/generation/registry';
import type { GenerationCreateParams } from '~/lib/generation/types';
import { createAtlascloudProviderWithOptions } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';

function safeId() {
  return (
    // Node 18+ / modern runtimes
    (globalThis as any).crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

function preview(text: string, max = 120) {
  const s = String(text || '');
  const oneLine = s.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

export async function POST(req: Request) {
  const requestId = safeId();
  const startedAt = Date.now();
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
    const id = safeId();
    console.info('[op:generation:create]', {
      requestId,
      provider: 'test',
      testImageUrl: Boolean(testImageUrl),
      promptLen: prompt.length,
      promptPreview: preview(prompt),
      aspectRatio: json.aspectRatio,
      quality: json.quality,
      count: json.count,
      elapsedMs: Date.now() - startedAt,
    });
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
  console.info('[op:generation:create:start]', {
    requestId,
    provider: providerName,
    hasApiKeyOverride: Boolean(apiKey),
    model: json.model,
    aspectRatio: json.aspectRatio,
    quality: json.quality,
    count: json.count,
    promptLen: prompt.length,
    promptPreview: preview(prompt),
  });
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
    console.info('[op:generation:create:done]', {
      requestId,
      provider: providerName,
      status: result.status,
      providerJobId: result.providerJobId,
      elapsedMs: Date.now() - startedAt,
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
    console.error('[op:generation:create:error]', {
      requestId,
      provider: providerName,
      elapsedMs: Date.now() - startedAt,
      error: e?.message || String(e),
    });
    return new Response(JSON.stringify({ error: e?.message || 'create failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

