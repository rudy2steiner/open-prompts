import { decodeProviderJobId, getProviderRegistry } from '~/lib/generation/registry';
import { createAtlascloudProviderWithOptions } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';

function safeId() {
  return (
    // Node 18+ / modern runtimes
    ((globalThis as any).crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`)
  );
}

export async function GET(req: Request, props: { params: Promise<{ providerJobId: string }> }) {
  const params = await props.params;
  const requestId = safeId();
  const startedAt = Date.now();
  const useTestMode = String(process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
  const testImageUrl = String(process.env.TEST_IMAGE_URL || '').trim();

  const encoded = decodeURIComponent(params.providerJobId || '');
  const { provider: providerName, providerJobId } = decodeProviderJobId(encoded);

  if (useTestMode) {
    console.info('[op:generation:poll]', {
      requestId,
      provider: 'test',
      providerJobId,
      status: 'succeeded',
      images: testImageUrl ? 1 : 0,
      elapsedMs: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({
        provider: 'test',
        providerJobId,
        status: 'succeeded',
        images: testImageUrl ? [testImageUrl] : [],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  }

  const headerKey = req.headers.get('x-op-api-key') || '';
  const apiKey = headerKey.trim();
  console.info('[op:generation:poll:start]', {
    requestId,
    provider: providerName,
    providerJobId,
    hasApiKeyOverride: Boolean(apiKey),
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

  const res = await provider.poll(providerJobId);
  console.info('[op:generation:poll:done]', {
    requestId,
    provider: providerName,
    providerJobId,
    status: res.status,
    images: Array.isArray(res.images) ? res.images.length : 0,
    hasError: Boolean(res.error),
    elapsedMs: Date.now() - startedAt,
  });
  return new Response(JSON.stringify({ provider: providerName, ...res }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

