import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import cache, { isMotionListCacheKey } from '../src/lib/cloudflare/motion-page-cache';

test('static deployment cache only applies to three motion list pages', async () => {
  for (const locale of ['en', 'zh', 'ja']) {
    assert.ok(isMotionListCacheKey(`${locale}/motion-prompts`));
    assert.ok(isMotionListCacheKey(`route-cache/APP_PAGE/hash/$/${locale}/motion-prompts`));
  }
  for (const key of ['en/gallery', 'en/login', 'api/auth/session', 'zh/motion-prompts/example', 'en/motion-prompts-archive']) {
    assert.equal(isMotionListCacheKey(key), false);
    assert.equal(await cache.get(key), null);
  }
});

test('public motion details reuse a build-scoped edge cache', async () => {
  const stored = new Map<string, Response>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
    async match(request: Request) { return stored.get(request.url)?.clone(); },
    async put(request: Request, response: Response) { stored.set(request.url, response); },
    async delete(request: Request) { return stored.delete(request.url); },
  } } });
  const previousBuild = process.env.OPEN_NEXT_BUILD_ID;
  try {
    process.env.OPEN_NEXT_BUILD_ID = 'test-a';
    const key = 'route-cache/APP_PAGE/hash/$/zh/motion-prompts/ui-morph';
    const value = { kind: 'APP_PAGE', html: '<main>Motion</main>' } as any;
    await cache.set(key, value);
    assert.deepEqual((await cache.get(key))?.value, value);
    process.env.OPEN_NEXT_BUILD_ID = 'test-b';
    assert.equal(await cache.get(key), null);
    process.env.OPEN_NEXT_BUILD_ID = 'test-a';
    await cache.delete(key);
    assert.equal(await cache.get(key), null);
    await cache.set('en/login', value);
    assert.equal(stored.size, 0);
  } finally {
    if (original) Object.defineProperty(globalThis, 'caches', original);
    else delete (globalThis as any).caches;
    if (previousBuild === undefined) delete process.env.OPEN_NEXT_BUILD_ID;
    else process.env.OPEN_NEXT_BUILD_ID = previousBuild;
  }
});
