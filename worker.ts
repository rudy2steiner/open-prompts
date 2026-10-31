// @ts-ignore OpenNext 在构建时生成此模块。
import handler from './.open-next/worker.js';
// @ts-ignore Wrangler 将构建 ID 作为 Text 模块导入，隔离不同部署。
import buildId from './.open-next/assets/BUILD_ID';
import { serveGalleryHtml } from './src/lib/cloudflare/gallery-html-cache';

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    const render = (publicRequest: Request) => handler.fetch(publicRequest, env, ctx);
    if (env.DB_MIGRATION_MODE === 'read-only') return render(request);
    const cache = (globalThis.caches as CacheStorage & { default?: Cache } | undefined)?.default;
    return serveGalleryHtml(request, render, cache, ctx, buildId.trim());
  },
};

// @ts-ignore 保留 OpenNext 的 Durable Object 导出。
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
