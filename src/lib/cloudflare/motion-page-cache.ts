import type { IncrementalCache } from '@opennextjs/aws/types/overrides.js';
import staticCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// 只读取随本次部署生成的三个列表页；不冻结其它页面的 ISR 或用户数据。
export function isMotionListCacheKey(key: string) {
  return /(?:^|\/)(en|zh|ja|ko|fr|de|es|pt)\/motion-prompts$/.test(key);
}
export function isMotionDetailCacheKey(key: string) {
  return /(?:^|\/)(en|zh|ja|ko|fr|de|es|pt)\/motion-prompts\/[^/]+$/.test(key);
}
function detailCache() {
  return (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
}
function detailRequest(key: string) {
  const build = process.env.OPEN_NEXT_BUILD_ID ?? 'local';
  return new Request(`https://motion-cache.internal/${encodeURIComponent(build)}/${encodeURIComponent(key)}`);
}

const motionPageCache: IncrementalCache = {
  // OpenNext 据此把构建缓存部署到静态资产，缓存按 build ID 隔离。
  name: staticCache.name,
  async get(key, cacheType) {
    if (isMotionListCacheKey(key)) return staticCache.get(key, cacheType);
    if (!isMotionDetailCacheKey(key) || cacheType === 'fetch' || cacheType === 'composable') return null;
    const response = await detailCache()?.match(detailRequest(key));
    return response ? response.json() : null;
  },
  async set(key, value, cacheType) {
    if (!isMotionDetailCacheKey(key) || cacheType === 'fetch' || cacheType === 'composable') return;
    await detailCache()?.put(detailRequest(key), new Response(JSON.stringify({ value, lastModified: Date.now() }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    }));
  },
  async delete(key) {
    if (isMotionDetailCacheKey(key)) await detailCache()?.delete(detailRequest(key));
  },
};
export default motionPageCache;
