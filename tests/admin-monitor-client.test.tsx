import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminMonitorCache, createLatestAdminRequest } from '../src/lib/admin/client-cache';

const data = (users: number) => ({
  summary: { users, spent: 0, generations: 0, events: 0 },
  users: [],
  generations: [],
  events: [],
  hasNext: false,
});

test('admin monitor cache retains each visited tab and page independently', () => {
  const cache = createAdminMonitorCache();
  cache.write('users', 1, data(10));
  cache.write('events', 1, data(20));
  assert.equal(cache.read('users', 1)?.summary.users, 10);
  assert.equal(cache.read('events', 1)?.summary.users, 20);
  assert.equal(cache.read('users', 2), null);
});

test('only the latest admin request can replace the active table', () => {
  const latest = createLatestAdminRequest();
  const users = latest.begin();
  const events = latest.begin();
  assert.equal(latest.isCurrent(users), false);
  assert.equal(latest.isCurrent(events), true);
});
