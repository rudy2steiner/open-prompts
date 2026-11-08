import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { guestSessions } from '~/db/schema';
import { getAuthSession } from '~/lib/auth/session';
import { persistGenerationCharge, readCreditAccount, refundGenerationCharge } from '~/lib/billing/accounts';
import { decideGeneration } from '~/lib/billing/generation-charge';
import { hashGuestToken, readGuestToken } from '~/lib/billing/guest';
import { settleLoginLedger } from '~/lib/billing/identity';
import { getProviderRegistry, getDefaultProviderName, encodeProviderJobId } from '~/lib/generation/registry';
import type { GenerationCreateParams } from '~/lib/generation/types';
import { isModelComingSoon, referenceImageLimit } from '~/lib/generation/capabilities';
import { createAtlascloudProviderWithOptions, pickAtlasSize } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';

function safeId() {
  return (
    (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

function preview(text: string, max = 120) {
  const oneLine = String(text || '').replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

async function ownerFromRequest(req: Request): Promise<string | null> {
  const session = await getAuthSession();
  if (session?.user?.id) {
    try { await settleLoginLedger(session.user.id, readGuestToken(req)); } catch (error) {
      console.error('[op:billing:settle]', error instanceof Error ? error.message : error);
    }
    return session.user.id;
  }
  const token = readGuestToken(req);
  const db = getDb();
  if (!token || !db) return null;
  const row = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt })
    .from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(token))).get();
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row.guestId;
}

export async function POST(req: Request) {
  const requestId = safeId();
  const startedAt = Date.now();
  const useTestMode = String(process.env.USE_TEST_MODE || '').toLowerCase() === 'true';
  const testImageUrl = String(process.env.TEST_IMAGE_URL || '').trim();
  const json = (await req.json().catch(() => ({}))) as Partial<GenerationCreateParams> & {
    provider?: string;
    apiKey?: string;
    path?: 'text-to-image' | 'reference' | 'edit';
  };
  const prompt = String(json.prompt || '').trim();
  if (!prompt) return Response.json({ error: 'Missing prompt' }, { status: 400 });

  const apiKey = typeof json.apiKey === 'string' ? json.apiKey.trim() : '';
  const providerName = (json.provider || getDefaultProviderName()).toLowerCase();
  const usesClientApiKey = Boolean(apiKey) && (providerName === 'atlascloud' || providerName === 'replicate');
  if (json.path !== undefined && !['text-to-image', 'reference', 'edit'].includes(json.path)) {
    return Response.json({ error: 'invalid_path' }, { status: 400 });
  }
  const path = json.path ?? 'text-to-image';
  const referenceImages = path !== 'text-to-image' && Array.isArray(json.referenceImages) ? json.referenceImages.map(String).filter(Boolean) : [];
  const model = String(json.model || 'GPT Image 2');
  if (isModelComingSoon(model)) return Response.json({ error: 'model_coming_soon' }, { status: 400 });
  const maxReferenceImages = referenceImageLimit(model);
  if (maxReferenceImages !== null && referenceImages.length > maxReferenceImages) {
    return Response.json({ error: 'too_many_reference_images', max: maxReferenceImages }, { status: 400 });
  }
  const requestedCount = json.count === undefined ? 1 : json.count;
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 4) {
    return Response.json({ error: 'invalid_count' }, { status: 400 });
  }
  const resolution = json.resolution === undefined ? '1k' : json.resolution;
  const size = pickAtlasSize(json.aspectRatio, resolution);
  if (providerName === 'atlascloud' && !size) return Response.json({ error: 'unsupported_size' }, { status: 400 });
  if (providerName !== 'atlascloud' && json.resolution !== undefined) return Response.json({ error: 'unsupported_size' }, { status: 400 });
  const ownerId = usesClientApiKey ? null : await ownerFromRequest(req);
  const decision = decideGeneration({
    byok: usesClientApiKey,
    ownerId,
    account: ownerId ? await readCreditAccount(ownerId) : null,
    model,
    path,
    quality: json.quality,
    width: size?.width,
    height: size?.height,
    count: requestedCount,
    hasReference: referenceImages.length > 0,
    now: Date.now(),
  });
  if (decision.action === 'reject') {
    return Response.json({ error: decision.error, credits: decision.credits, pricing: decision.error === 'insufficient' }, { status: decision.status });
  }

  let generationId: string | null = null;
  if (decision.action === 'charge') {
    if (!ownerId) return Response.json({ error: 'no_identity' }, { status: 402 });
    generationId = safeId();
    const saved = await persistGenerationCharge({ ownerId, generationId, model: decision.slug, credits: decision.credits });
    if (saved === 'insufficient' || saved === 'unavailable') {
      return Response.json({ error: saved, credits: decision.credits, pricing: saved === 'insufficient' }, { status: saved === 'unavailable' ? 503 : 402 });
    }
  }

  if (useTestMode) {
    console.info('[op:generation:create]', { requestId, provider: 'test', testImageUrl: Boolean(testImageUrl), promptLen: prompt.length, promptPreview: preview(prompt), elapsedMs: Date.now() - startedAt });
    return Response.json({ provider: 'test', providerJobId: encodeProviderJobId('test', safeId()), generationId, status: 'queued', credits: decision.action === 'charge' ? decision.credits : 0 });
  }

  const provider = apiKey && providerName === 'atlascloud'
    ? createAtlascloudProviderWithOptions({ apiKey })
    : apiKey && providerName === 'replicate'
      ? createReplicateProviderWithOptions({ token: apiKey })
      : getProviderRegistry()[providerName];
  if (!provider) return Response.json({ error: `Unknown provider: ${providerName}` }, { status: 400 });

  try {
    const result = await provider.create({
      prompt,
      negativePrompt: json.negativePrompt,
      model: decision.slug,
      aspectRatio: json.aspectRatio,
      ...(providerName === 'atlascloud' ? { resolution } : {}),
      quality: json.quality,
      count: requestedCount,
      referenceImages,
    });
    if (result.status === 'failed' && generationId) await refundGenerationCharge(generationId);
    return Response.json({
      provider: providerName,
      providerJobId: encodeProviderJobId(providerName, result.providerJobId),
      status: result.status,
      generationId,
      credits: decision.action === 'charge' ? decision.credits : 0,
    });
  } catch (error) {
    if (generationId) await refundGenerationCharge(generationId);
    console.error('[op:generation:create:error]', { requestId, provider: providerName, elapsedMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: error instanceof Error ? error.message : 'create failed' }, { status: 500 });
  }
}
