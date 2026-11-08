import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createStaleCache } from '../src/lib/cache/stale-while-revalidate';

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

test('cache waits on a miss and reuses a fresh value', async () => {
  let now = 1_000;
  let loads = 0;
  const cache = createStaleCache<number>({ freshMs: 100, staleMs: 500, now: () => now });
  const loader = async () => ++loads;
  assert.equal(await cache.get('a', loader), 1);
  now = 1_099;
  assert.equal(await cache.get('a', loader), 1);
  assert.equal(loads, 1);
});

test('stale reads return immediately and deduplicate background refreshes', async () => {
  let now = 1_000;
  let loads = 0;
  let release!: (value: number) => void;
  const cache = createStaleCache<number>({ freshMs: 100, staleMs: 500, now: () => now });
  await cache.get('a', async () => ++loads);
  now = 1_101;
  const refresh = () => new Promise<number>((resolve) => {
    loads += 1;
    release = resolve;
  });
  assert.equal(await cache.get('a', refresh), 1);
  assert.equal(await cache.get('a', refresh), 1);
  assert.equal(loads, 2);
  release(9);
  await settle();
  assert.equal(await cache.get('a', refresh), 9);
});

test('a failed stale refresh keeps the previous value', async () => {
  let now = 1_000;
  const cache = createStaleCache<string>({ freshMs: 100, staleMs: 500, now: () => now });
  await cache.get('a', async () => 'old');
  now = 1_101;
  assert.equal(await cache.get('a', async () => { throw new Error('offline'); }), 'old');
  await settle();
  assert.equal(await cache.get('a', async () => 'new'), 'old');
});

test('reads beyond the stale window wait for a new value', async () => {
  let now = 1_000;
  const cache = createStaleCache<string>({ freshMs: 100, staleMs: 500, now: () => now });
  await cache.get('a', async () => 'old');
  now = 1_601;
  assert.equal(await cache.get('a', async () => 'new'), 'new');
});

test('exact and prefix invalidation remove only matching entries', async () => {
  const cache = createStaleCache<string>({ freshMs: 100, staleMs: 500 });
  await cache.get('users:1', async () => 'u1');
  await cache.get('users:2', async () => 'u2');
  await cache.get('orders:1', async () => 'o1');
  cache.invalidate('users:1');
  assert.equal(await cache.get('users:1', async () => 'u1-new'), 'u1-new');
  cache.invalidatePrefix('users:');
  assert.equal(await cache.get('users:2', async () => 'u2-new'), 'u2-new');
  assert.equal(await cache.get('orders:1', async () => 'o1-new'), 'o1');
  cache.clear();
  assert.equal(await cache.get('orders:1', async () => 'o1-new'), 'o1-new');
});
