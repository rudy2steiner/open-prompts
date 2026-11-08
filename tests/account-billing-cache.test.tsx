import assert from 'node:assert/strict';
import test from 'node:test';
import {
  billingCacheKey,
  createBillingPageCache,
  createLatestBillingRequest,
  type BillingPageData,
} from '../src/lib/billing/client-cache';

const data = (usable: number): BillingPageData => ({
  summary: { usable, purchased: usable, monthly: 0, monthlyExpiresAt: null, subscription: null },
  orders: [],
  credits: [],
  generations: [],
  hasNext: false,
});

test('billing page cache isolates users, tabs, and pages', () => {
  const cache = createBillingPageCache();
  cache.write('user-a', 'orders', 1, data(10));
  cache.write('user-a', 'credits', 1, data(20));
  cache.write('user-b', 'orders', 1, data(30));
  assert.equal(billingCacheKey('user-a', 'orders', 1), 'user-a:orders:1');
  assert.equal(cache.read('user-a', 'orders', 1)?.summary.usable, 10);
  assert.equal(cache.read('user-a', 'credits', 1)?.summary.usable, 20);
  assert.equal(cache.read('user-b', 'orders', 1)?.summary.usable, 30);
});

test('clearing one user never removes another user billing data', () => {
  const cache = createBillingPageCache();
  cache.write('user-a', 'orders', 1, data(10));
  cache.write('user-b', 'orders', 1, data(30));
  cache.clearForUser('user-a');
  assert.equal(cache.read('user-a', 'orders', 1), null);
  assert.equal(cache.read('user-b', 'orders', 1)?.summary.usable, 30);
});

test('only the latest billing request can replace visible data', () => {
  const latest = createLatestBillingRequest();
  const first = latest.begin();
  const second = latest.begin();
  assert.equal(latest.isCurrent(first), false);
  assert.equal(latest.isCurrent(second), true);
});
