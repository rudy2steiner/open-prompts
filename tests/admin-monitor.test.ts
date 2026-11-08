import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPricingClickEvent, parseAnalyticsEvent } from '../src/lib/analytics/events';
import { adminTab, normalizeAdminPage } from '../src/lib/admin/monitor';
import { adminQueryKey, createAdminCacheSet } from '../src/lib/admin/cache';

test('pricing clicks keep only the plan and payment fields and reject other events', () => {
  const event = buildPricingClickEvent({
    planId: 'one-time-9',
    price: '¥71',
    locale: 'zh',
    page: '/zh/pricing',
    billingType: 'one_time',
    paymentMethod: 'wechat_pay',
    currency: 'cny',
  });
  assert.equal(event.name, 'Pricing Plan Click');
  const parsed = parseAnalyticsEvent({ id: 'evt-1', ...event, properties: { ...event.properties, prompt: 'secret' } });
  assert.equal(parsed?.subject, 'one-time-9');
  assert.equal(parsed?.properties.price, '¥71');
  assert.equal(parsed?.properties.paymentMethod, 'wechat_pay');
  assert.equal(parsed?.properties.currency, 'cny');
  assert.equal('prompt' in (parsed?.properties ?? {}), false);
  assert.equal(parseAnalyticsEvent({ id: 'evt-2', name: 'Generate Video Click', properties: { plan: 'monthly' } }), null);
  assert.equal(parseAnalyticsEvent({ id: '', name: 'Pricing Plan Click', properties: { plan: 'monthly' } }), null);
});

test('admin pages stay on the users, generations, and pricing-click tabs', () => {
  assert.equal(normalizeAdminPage('2'), 2);
  assert.equal(normalizeAdminPage('0'), 1);
  assert.equal(normalizeAdminPage('nope'), 1);
  assert.equal(adminTab('events'), 'events');
  assert.equal(adminTab('orders'), 'users');
});

test('admin cache keys include every result-shaping query field', () => {
  assert.equal(adminQueryKey({ namespace: 'templates', tab: 'review', page: 2, pageSize: 50, offset: 50, query: ' cat ', status: 'pending', visibility: 'public', trendDays: 30 }), 'templates:tab=review&page=2&pageSize=50&offset=50&query=cat&status=pending&visibility=public&trendDays=30');
});

test('admin summary and pages use their independent fresh and stale windows', async () => {
  let now = 1_000;
  let summaryLoads = 0;
  let pageLoads = 0;
  const caches = createAdminCacheSet(() => now);
  assert.equal(await caches.cachedSummary(async () => ++summaryLoads), 1);
  assert.equal(await caches.cachedPage('users:page=1', async () => ++pageLoads), 1);
  now += 15_001;
  assert.equal(await caches.cachedPage('users:page=1', async () => ++pageLoads), 1);
  assert.equal(pageLoads, 2);
  assert.equal(await caches.cachedSummary(async () => ++summaryLoads), 1);
  assert.equal(summaryLoads, 1);
  now += 15_000;
  assert.equal(await caches.cachedSummary(async () => ++summaryLoads), 1);
  assert.equal(summaryLoads, 2);
});
