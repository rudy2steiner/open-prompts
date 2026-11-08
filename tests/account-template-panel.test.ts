import assert from 'node:assert/strict';
import test from 'node:test';
import { accountListQueryKey, createAccountListCache, createLatestAccountRequest } from '../src/lib/account/panel-cache';

test('account list cache key includes every search and pagination input', () => {
  assert.equal(accountListQueryKey({ namespace: 'admin-users', search: ' ada ', status: 'active', page: 2, pageSize: 50, trendDays: 30 }), 'admin-users:search=ada&status=active&page=2&pageSize=50&trendDays=30');
});

test('account list cache returns visited data without browser storage', () => {
  const cache = createAccountListCache<{ items: string[] }>();
  cache.write('users:1', { items: ['Ada'] }, 1_000);
  assert.deepEqual(cache.read('users:1'), { data: { items: ['Ada'] }, updatedAt: 1_000 });
  assert.equal(cache.read('users:2'), null);
});

test('independent request gates reject stale template and user responses', () => {
  const templates = createLatestAccountRequest();
  const users = createLatestAccountRequest();
  const oldTemplate = templates.begin();
  const currentTemplate = templates.begin();
  const currentUsers = users.begin();
  assert.equal(templates.isCurrent(oldTemplate), false);
  assert.equal(templates.isCurrent(currentTemplate), true);
  assert.equal(users.isCurrent(currentUsers), true);
});
