import { decodeProviderJobId, getProviderRegistry } from '~/lib/generation/registry';
import { createAtlascloudProviderWithOptions } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';

export async function GET(req: Request, { params }: { params: { providerJobId: string } }) {
  const useTestMode = String(process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
  const testImageUrl = String(process.env.TEST_IMAGE_URL || '').trim();

  const encoded = decodeURIComponent(params.providerJobId || '');
  const { provider: providerName, providerJobId } = decodeProviderJobId(encoded);

  if (useTestMode) {
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
  return new Response(JSON.stringify({ provider: providerName, ...res }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

