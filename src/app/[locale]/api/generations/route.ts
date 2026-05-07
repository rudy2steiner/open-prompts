import { getProviderRegistry, getDefaultProviderName, encodeProviderJobId } from '~/lib/generation/registry';
import type { GenerationCreateParams } from '~/lib/generation/types';
import { createAtlascloudProviderWithOptions } from '~/lib/generation/providers/atlascloud';
import { createReplicateProviderWithOptions } from '~/lib/generation/providers/replicate';
import {
  canConsumeCredits,
  consumeCredits,
  getCreditsCookieName,
  getInternalCreditsLimitsFromEnv,
  parseCreditsCookie,
  serializeCreditsCookie,
} from '~/lib/credits/server';

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

  // Credits: only enforce when using internal config (no per-user apiKey override).
  // If user provides their own key, do NOT limit.
  const apiKey = typeof json.apiKey === 'string' ? json.apiKey.trim() : '';
  const isInternalModeRequest = !json.provider && !apiKey;
  const userId = (req.headers.get('x-op-user-id') || '').trim();
  const requestedCount =
    typeof json.count === 'number' && Number.isFinite(json.count) ? Math.max(1, Math.floor(json.count)) : 1;

  // Enforce internal credits even in test mode.
  if (isInternalModeRequest) {
    const limits = getInternalCreditsLimitsFromEnv();
    const hasAnyLimit = limits.daily != null || limits.monthly != null;
    if (hasAnyLimit) {
      const cookie = req.headers.get('cookie') || '';
      const name = getCreditsCookieName();
      const value = cookie
        .split(';')
        .map((p) => p.trim())
        .find((p) => p.startsWith(`${name}=`))
        ?.slice(name.length + 1) ?? null;

      const usage = parseCreditsCookie(value, { userId: userId || undefined });
      const allowed = canConsumeCredits(limits, usage, requestedCount);
      if (!allowed.ok) {
        const detail =
          allowed.reason === 'daily'
            ? `Daily credits exceeded (${usage.dayUsed}/${limits.daily})`
            : `Monthly credits exceeded (${usage.monthUsed}/${limits.monthly})`;
        return new Response(
          JSON.stringify({
            error: 'Credits exceeded',
            detail,
            limits,
            usage,
            hint: 'Configure INTERNAL_DAILY_IMAGE_CREDITS / INTERNAL_MONTHLY_IMAGE_CREDITS, or use your own provider apiKey override to bypass limits.',
          }),
          { status: 429, headers: { 'content-type': 'application/json' } }
        );
      }
    }
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
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (isInternalModeRequest) {
      const limits = getInternalCreditsLimitsFromEnv();
      const hasAnyLimit = limits.daily != null || limits.monthly != null;
      if (hasAnyLimit) {
        const cookie = req.headers.get('cookie') || '';
        const name = getCreditsCookieName();
        const value = cookie
          .split(';')
          .map((p) => p.trim())
          .find((p) => p.startsWith(`${name}=`))
          ?.slice(name.length + 1) ?? null;
        const usage = parseCreditsCookie(value, { userId: userId || undefined });
        const next = consumeCredits({ ...usage, userId: userId || usage.userId }, requestedCount);
        headers['set-cookie'] = serializeCreditsCookie(next, {
          secure: String(process.env.NODE_ENV || '') === 'production',
        });
      }
    }
    return new Response(
      JSON.stringify({
        provider: 'test',
        providerJobId: encodeProviderJobId('test', id),
        // Let the client polling path populate images.
        status: 'queued',
      }),
      { status: 200, headers }
    );
  }

  const providerName = (json.provider || getDefaultProviderName()).toLowerCase();
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
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (isInternalModeRequest && result.status !== 'failed') {
      const limits = getInternalCreditsLimitsFromEnv();
      const hasAnyLimit = limits.daily != null || limits.monthly != null;
      if (hasAnyLimit) {
        const cookie = req.headers.get('cookie') || '';
        const name = getCreditsCookieName();
        const value = cookie
          .split(';')
          .map((p) => p.trim())
          .find((p) => p.startsWith(`${name}=`))
          ?.slice(name.length + 1) ?? null;
        const usage = parseCreditsCookie(value, { userId: userId || undefined });
        const next = consumeCredits(
          { ...usage, userId: userId || usage.userId },
          requestedCount
        );
        headers['set-cookie'] = serializeCreditsCookie(next, {
          secure: String(process.env.NODE_ENV || '') === 'production',
        });
      }
    }

    return new Response(
      JSON.stringify({
        provider: providerName,
        providerJobId: encodeProviderJobId(providerName, result.providerJobId),
        status: result.status,
      }),
      { status: 200, headers }
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

