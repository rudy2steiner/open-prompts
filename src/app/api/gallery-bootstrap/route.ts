import { getGalleryBootstrap } from '~/lib/prompts/gallery-bootstrap';
import { normalizeGalleryOffset } from '~/lib/prompts/gallery-preview';
import { normalizeSubmitCategoryKey } from '~/lib/prompts/prompt-categories';

/** 与 SSR 共用的公开卡片预览，不包含提示词正文或用户信息。 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const started = performance.now();
  const data = await getGalleryBootstrap({
    offset: normalizeGalleryOffset(url.searchParams.get('offset')),
    model: url.searchParams.get('model')?.trim() || undefined,
    category: normalizeSubmitCategoryKey(url.searchParams.get('category') ?? '') ?? undefined,
  });
  const { cacheStatus, ...payload } = data;
  // 翻页不能把暂时的 D1 故障解释成目录已结束，避免混入另一份兜底数据。
  if (normalizeGalleryOffset(url.searchParams.get('offset')) > 0 && cacheStatus === 'FALLBACK') {
    return Response.json({ error: 'Gallery temporarily unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(payload, { headers: {
    'Cache-Control': 'no-store',
    'Server-Timing': `gallery;dur=${(performance.now() - started).toFixed(1)}`,
    'X-Gallery-Cache': cacheStatus ?? 'MISS',
  } });
}
