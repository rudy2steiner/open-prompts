import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminCacheSet } from '../src/lib/admin/cache';

test('admin namespace invalidation removes matching pages and the summary only', async () => {
  let usersLoads = 0;
  let templatesLoads = 0;
  let summaryLoads = 0;
  const caches = createAdminCacheSet(() => 1_000);
  await caches.cachedPage('users:page=1', async () => ++usersLoads);
  await caches.cachedPage('templates:page=1', async () => ++templatesLoads);
  await caches.cachedSummary(async () => ++summaryLoads);

  caches.invalidate('users');
  assert.equal(await caches.cachedPage('users:page=1', async () => ++usersLoads), 2);
  assert.equal(await caches.cachedPage('templates:page=1', async () => ++templatesLoads), 1);
  assert.equal(await caches.cachedSummary(async () => ++summaryLoads), 2);
});

test('failed writes do not require invalidation while successful writes do', async () => {
  let loads = 0;
  const caches = createAdminCacheSet(() => 1_000);
  const read = () => caches.cachedPage('review:page=1', async () => ++loads);
  assert.equal(await read(), 1);
  const completeWrite = (succeeded: boolean) => {
    if (succeeded) caches.invalidate('review');
  };
  completeWrite(false);
  assert.equal(await read(), 1);
  completeWrite(true);
  assert.equal(await read(), 2);
});
