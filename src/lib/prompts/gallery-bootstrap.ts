import { sortGalleryByDate } from './gallery-order';
import { count, desc } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { prompts } from '~/db/schema';
import { PROMPT_GALLERY } from '~/data/promptGallery';
import { fetchPromptGalleryFromDb } from './from-db';
import { galleryPublicFilter } from './template-record';
import { toGalleryPreview, normalizeGalleryOffset, nextGalleryOffset } from './gallery-preview';
import { promptMatchesGalleryFilter, type SubmitCategoryKey } from './prompt-categories';

type Filters = { model?: string; category?: SubmitCategoryKey; offset?: number };
type Bootstrap = { nextOffset?: number | null; cacheStatus?: 'HIT' | 'MISS' | 'FALLBACK'; items: typeof PROMPT_GALLERY; total: number; models: string[] };
export async function getGalleryBootstrap(filters: Filters = {}): Promise<Bootstrap> {
  const offset = normalizeGalleryOffset(filters.offset);
  filters = { ...filters, offset };
  const edge = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
  const cacheKey = new Request(`https://www.open-prompts.com/__edge-cache/gallery-bootstrap/${process.env.OPEN_NEXT_BUILD_ID ?? 'local'}/${encodeURIComponent(JSON.stringify(filters))}`);
  try { const cached = await edge?.match(cacheKey); if (cached) return { ...await cached.json() as Bootstrap, cacheStatus: 'HIT' }; } catch { /* 继续读取 D1。 */ }
  try {
    const db = getDb();
    if (db) {
      let result: Bootstrap | undefined;
      if (filters.model || filters.category) {
        // 分类存在标签推断规则，读取轻量索引并复用原分类函数，避免扫描和传输全部正文/图片。
        const index = await db.select({ id: prompts.id, model: prompts.model, category: prompts.category, tags: prompts.tags })
          .from(prompts).where(galleryPublicFilter()).orderBy(desc(prompts.createdAt), desc(prompts.id));
        const models = Array.from(new Set(index.map(row => row.model)));
        const model = filters.model && models.includes(filters.model) ? filters.model : undefined;
        const matches = index.filter(row => (!model || row.model === model) && promptMatchesGalleryFilter(row, filters.category ?? 'all', null));
        const items = matches.slice(offset, offset + 18).length ? await fetchPromptGalleryFromDb(18, matches.slice(offset, offset + 18).map(row => row.id), true) : [];
        if (items) result = { items: toGalleryPreview(items), total: matches.length, models };
      } else {
        const [items, totals, models] = await Promise.all([
          fetchPromptGalleryFromDb(18, undefined, true, offset),
          db.select({ value: count() }).from(prompts).where(galleryPublicFilter()),
          db.selectDistinct({ model: prompts.model }).from(prompts).where(galleryPublicFilter()),
        ]);
        if (items) result = { items: toGalleryPreview(items), total: totals[0]?.value ?? items.length, models: models.map(row => row.model) };
      }
      if (result) {
        result.nextOffset = nextGalleryOffset(offset, result.items.length, result.total);
        try { await edge?.put(cacheKey, Response.json(result, { headers: { 'Cache-Control': 'public, max-age=300' } })); } catch { /* 缓存故障不阻止首屏。 */ }
        return { ...result, cacheStatus: 'MISS' };
      }
    }
  } catch { /* 不把暂时的 D1 故障变成整页白屏，故障兜底不写缓存。 */ }
  const models = Array.from(new Set(PROMPT_GALLERY.map(row => row.model)));
  const model = filters.model && models.includes(filters.model) ? filters.model : undefined;
  const items = sortGalleryByDate(PROMPT_GALLERY.filter(row => (!model || row.model === model) && promptMatchesGalleryFilter(row, filters.category ?? 'all', null)));
  const page = toGalleryPreview(items.slice(offset, offset + 18));
  return { items: page, total: items.length, models, nextOffset: nextGalleryOffset(offset, page.length, items.length), cacheStatus: 'FALLBACK' };
}
