import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getGalleryBootstrap } from '../src/lib/prompts/gallery-bootstrap';

test('public gallery cache uses own domain and a build-scoped key', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  let requested = '';
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
    async match(request: Request) { requested = request.url; return Response.json({ items: [], total: 42, models: ['GPT Image 2'] }); },
  } } });
  try {
    const result = await getGalleryBootstrap();
    assert.equal(result.cacheStatus, 'HIT');
    assert.equal(result.total, 42);
    assert.ok(requested.startsWith('https://www.open-prompts.com/__edge-cache/gallery-bootstrap/'));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'caches', descriptor);
    else delete (globalThis as any).caches;
  }
});
test('cache or binding unavailability returns visible previews, never caches a fallback', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  let written = false;
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: {
    async match() { throw Error('unavailable'); },
    async put() { written = true; },
  } } });
  try {
    const result = await getGalleryBootstrap();
    assert.equal(result.cacheStatus, 'FALLBACK');
    assert.ok(result.items.length <= 18);
    assert.ok(result.items.every(item => item.prompt === ''));
    assert.equal(written, false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'caches', descriptor);
    else delete (globalThis as any).caches;
  }
});
