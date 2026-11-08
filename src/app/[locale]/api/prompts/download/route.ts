import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { guestSessions, orders, promptDownloads, subscriptions } from '~/db/schema';
import { downloadLimitForPlans } from '~/lib/billing/catalog';
import { hashGuestToken, readGuestToken } from '~/lib/billing/guest';
import { settleLoginLedger } from '~/lib/billing/identity';
import { getAuthSession } from '~/lib/auth/session';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { applyDownloadQuota, selectBatchDownload } from '~/lib/prompts/batch-download';
import { SUBMIT_CATEGORY_KEYS, type SubmitCategoryKey } from '~/lib/prompts/prompt-categories';
import { getMessages } from 'next-intl/server';
import { createPromptDownload, downloadCatalogItems, loadPromptDownloadImage } from '~/lib/prompts/prompt-download';
import downloadAssets from '~/lib/prompts/download-assets.json';
import { getSiteUrl, normalizeLocale } from '~/lib/seo/metadata';
import { galleryCoverUrl } from '~/lib/prompts/gallery-cover-url';

export const dynamic = 'force-dynamic';


async function ownerFromRequest(request: Request): Promise<string | null> {
  const session = await getAuthSession();
  if (session?.user?.id) {
    try { await settleLoginLedger(session.user.id, readGuestToken(request)); } catch (error) {
      console.error('[op:billing:settle]', error instanceof Error ? error.message : error);
    }
    return session.user.id;
  }
  const token = readGuestToken(request);
  const db = getDb();
  if (!token || !db) return null;
  const row = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt })
    .from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(token))).get();
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return row.guestId;
}

async function downloadLimitForOwner(ownerId: string | null): Promise<number | null> {
  if (!ownerId) return 0;
  const db = getDb();
  if (!db) return 0;
  const [paid, subscription] = await Promise.all([
    db.select({ productId: orders.productId }).from(orders).where(and(eq(orders.ownerId, ownerId), eq(orders.status, 'paid'))),
    db.select({ status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd })
      .from(subscriptions).where(eq(subscriptions.ownerId, ownerId)).orderBy(desc(subscriptions.updatedAt)).get(),
  ]);
  const monthlyActive = subscription?.status === 'active' && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() > Date.now());
  return downloadLimitForPlans(paid.map((row) => row.productId), monthlyActive);
}

function categoryOf(value: unknown): 'all' | SubmitCategoryKey {
  return SUBMIT_CATEGORY_KEYS.includes(value as SubmitCategoryKey) ? value as SubmitCategoryKey : 'all';
}

function selectedIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((id): id is string => typeof id === 'string').slice(0, 5000);
}

async function ownedPromptIds(ownerId: string): Promise<string[]> {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select({ promptId: promptDownloads.promptId }).from(promptDownloads).where(eq(promptDownloads.ownerId, ownerId));
  return rows.map((row) => row.promptId);
}

async function recordPromptDownloads(ownerId: string, promptIds: readonly string[], limit: number | null): Promise<void> {
  if (promptIds.length < 1) return;
  const db = getDb();
  if (!db) throw new Error('Download accounting unavailable');
  // One statement makes the cap check and the entire acquisition indivisible.
  await db.run(sql`
    WITH requested AS (SELECT DISTINCT value AS prompt_id FROM json_each(${JSON.stringify(promptIds)})),
    fresh AS MATERIALIZED (
      SELECT prompt_id FROM requested WHERE NOT EXISTS (
        SELECT 1 FROM ${promptDownloads}
        WHERE ${promptDownloads.ownerId} = ${ownerId} AND ${promptDownloads.promptId} = requested.prompt_id
      )
    )
    INSERT INTO ${promptDownloads} (owner_id, prompt_id, created_at)
    SELECT ${ownerId}, prompt_id, ${Date.now()} FROM fresh
    WHERE ${limit} IS NULL OR (
      (SELECT COUNT(*) FROM ${promptDownloads} WHERE ${promptDownloads.ownerId} = ${ownerId})
      + (SELECT COUNT(*) FROM fresh) <= ${limit}
    )
    ON CONFLICT DO NOTHING
  `);
  const acquired = new Set(await ownedPromptIds(ownerId));
  if (promptIds.some(id => !acquired.has(id))) throw new Error('download_quota');
}

export async function GET(request: Request): Promise<Response> {
  const ownerId = await ownerFromRequest(request);
  const limit = await downloadLimitForOwner(ownerId);
  if (limit !== null && limit < 1) return Response.json({ error: 'plan_required' }, { status: 402 });
  const taken = ownerId ? await ownedPromptIds(ownerId) : [];
  const items = downloadCatalogItems(await getPromptGallery()).map(item => ({...item, previewSrc: galleryCoverUrl(item.previewSrc ?? undefined) ?? null}));
  return Response.json({ limit, taken, remaining: limit === null ? null : Math.max(0, limit - taken.length), items });
}

export async function POST(request: Request): Promise<Response> {
  const ownerId = await ownerFromRequest(request);
  const limit = await downloadLimitForOwner(ownerId);
  if (limit !== null && limit < 1) return Response.json({ error: 'plan_required' }, { status: 402 });
  const body = await request.json().catch(() => null) as { query?: unknown; model?: unknown; category?: unknown; tag?: unknown; ids?: unknown; format?: unknown; imageMode?: unknown } | null;
  if (!body || Array.isArray(body) || (body.format !== 'html' && body.format !== 'zip')) return Response.json({error: 'invalid_format'}, {status: 400});
  if (body.imageMode !== undefined && body.imageMode !== 'embedded' && body.imageMode !== 'links') return Response.json({error: 'invalid_image_mode'}, {status: 400});
  const imageMode = body.imageMode === 'links' ? 'links' : 'embedded';
  const selected = selectBatchDownload(await getPromptGallery(), {
    limit: null,
    ids: selectedIds(body.ids),
    query: typeof body.query === 'string' ? body.query : '',
    model: typeof body.model === 'string' ? body.model : 'all',
    category: categoryOf(body.category),
    tag: typeof body.tag === 'string' ? body.tag : null,
  });
  const quota = applyDownloadQuota({
    requestedIds: selected.map((item) => item.id),
    ownedIds: ownerId ? await ownedPromptIds(ownerId) : [],
    limit,
  });
  if (quota.exceeded) return Response.json({ error: 'download_quota', remaining: quota.remaining }, { status: 403 });
  const allowed = new Set(quota.allowed);
  const fileItems = selected.filter((item) => allowed.has(item.id));
  if (!fileItems.length) return Response.json({error: 'empty_selection'}, {status: 400});
  const locale = normalizeLocale(new URL(request.url).pathname.split('/')[1] ?? 'en');
  let response: Response;
  try {
    response = await createPromptDownload({
    items: fileItems, format: body.format, imageMode, origin: getSiteUrl(), locale,
    messages: body.format === 'html' ? await getMessages({locale}) : {},
    assets: downloadAssets, signal: request.signal,
    loadImage: source => loadPromptDownloadImage(source, {origin: getSiteUrl(), signal: request.signal}),
    onComplete: async () => {
      if (!ownerId) return;
      request.signal.throwIfAborted();
      const latest = applyDownloadQuota({requestedIds: fileItems.map(item => item.id), ownedIds: await ownedPromptIds(ownerId), limit});
      if (latest.exceeded) throw new Error('download_quota');
      request.signal.throwIfAborted();
      await recordPromptDownloads(ownerId, latest.newIds, limit);
    },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'download_quota') return Response.json({error: 'download_quota'}, {status: 403});
    console.error('[op:download:export]', error instanceof Error ? error.message : 'Unknown export error');
    return Response.json({error: 'export_failed'}, {status: 502});
  }
  response.headers.set('x-download-count', String(fileItems.length));
  response.headers.set('x-download-new', String(quota.newIds.length));
  response.headers.set('x-download-limit', limit === null ? 'unlimited' : String(limit));
  response.headers.set('x-download-remaining', quota.remaining === null ? 'unlimited' : String(quota.remaining - quota.newIds.length));
  return response;
}
