import { getAuthSession } from '~/lib/auth/session';
import { markGenerationSucceeded, refundGenerationCharge } from '~/lib/billing/accounts';
import { hashGuestToken, readGuestToken } from '~/lib/billing/guest';
import { getDb } from '~/db/client';
import { guestSessions } from '~/db/schema';
import { eq } from 'drizzle-orm';
import { decodeProviderJobId, getProviderRegistry } from '~/lib/generation/registry';
import { createAtlascloudProviderWithOptions } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';
import { invalidateAdminCache } from '~/lib/admin/cache';

function safeId() {
  return (
    // Node 18+ / modern runtimes
    ((globalThis as any).crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`)
  );
}
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const requestId = safeId();
  const startedAt = Date.now();
  const useTestMode = String(process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
  const testImageUrl = String(process.env.TEST_IMAGE_URL || '').trim();

  const encoded = decodeURIComponent(params.id || '');
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
  const generationId = new URL(req.url).searchParams.get('generationId');
  if (generationId) {
    const session = await getAuthSession();
    let ownerId = session?.user?.id ?? null;
    if (!ownerId) {
      const token = readGuestToken(req);
      const db = getDb();
      if (token && db) {
        const guest = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt }).from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(token))).get();
        if (guest && guest.expiresAt.getTime() > Date.now()) ownerId = guest.guestId;
      }
    }
    if (ownerId && res.status === 'succeeded' && Array.isArray(res.images)) {
      await markGenerationSucceeded(generationId, ownerId, res.images);
      invalidateAdminCache('generations');
      invalidateAdminCache('users');
    }
    if (ownerId && res.status === 'failed') {
      await refundGenerationCharge(generationId);
      invalidateAdminCache('generations');
      invalidateAdminCache('users');
    }
  }
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
