import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { creditsForPriceCents, downloadLimitForPlans, findPurchasablePlan, imagePrice, PURCHASABLE_PLANS, savingsVersusStarter } from '../src/lib/billing/catalog';
import { applyDownloadQuota, selectBatchDownload } from '../src/lib/prompts/batch-download';

test('catalog prices keep a 50 percent margin in credits', () => {
  assert.deepEqual(
    PURCHASABLE_PLANS.map((plan) => [plan.id, plan.amount, plan.credits, plan.downloadLimit]),
    [
      ['one-time', 490, 245, 500],
      ['one-time-9', 990, 619, 1000],
      ['one-time-19', 1990, 1499, null],
      ['monthly', 990, 749, null],
    ],
  );
  assert.equal(findPurchasablePlan('one-time')?.credits, creditsForPriceCents(490));
  assert.ok((findPurchasablePlan('one-time-9')?.credits ?? 0) > creditsForPriceCents(990));
  assert.ok((findPurchasablePlan('one-time-19')?.credits ?? 0) > creditsForPriceCents(1990));
  assert.equal(imagePrice(PURCHASABLE_PLANS[0]), '$0.04');
  assert.equal(imagePrice(PURCHASABLE_PLANS[1]), '$0.032');
  assert.equal(imagePrice(PURCHASABLE_PLANS[2]), '$0.027');
  assert.equal(savingsVersusStarter(PURCHASABLE_PLANS[0]), 0);
  assert.equal(savingsVersusStarter(PURCHASABLE_PLANS[1]), 20);
  assert.equal(savingsVersusStarter(PURCHASABLE_PLANS[2]), 34);
  assert.equal(savingsVersusStarter(PURCHASABLE_PLANS[3]), 34);
  assert.equal(Math.round((PURCHASABLE_PLANS[3].credits / PURCHASABLE_PLANS[1].credits - 1) * 100), 21);
  assert.equal(downloadLimitForPlans([], false), 0);
  assert.equal(downloadLimitForPlans(['one-time'], false), 500);
  assert.equal(downloadLimitForPlans(['one-time-9'], false), 1000);
  assert.equal(downloadLimitForPlans(['one-time', 'one-time-19'], false), null);
  assert.equal(downloadLimitForPlans(['one-time'], true), null);
  for (const plan of PURCHASABLE_PLANS) assert.equal(plan.currency, 'usd');
  assert.equal(findPurchasablePlan('monthly')?.kind, 'monthly');
});

test('batch download includes every matching template up to the plan cap', () => {
  const items = [
    { id: 'a', title: 'A', prompt: 'one', model: 'GPT', tags: [] },
    { id: 'b', title: 'B', prompt: 'two', model: 'GPT', tags: [] },
    { id: 'c', title: 'C', prompt: 'three', model: 'Other', tags: [] },
  ];
  assert.equal(selectBatchDownload(items, { limit: 0 }).length, 0);
  assert.deepEqual(selectBatchDownload(items, { limit: 20, model: 'GPT' }).map((item) => item.id), ['a', 'b']);
  assert.deepEqual(selectBatchDownload(items, { limit: 1 }).map((item) => item.id), ['a']);
  assert.deepEqual(selectBatchDownload(items, { limit: null, model: 'GPT' }).map((item) => item.id), ['a', 'b']);
  assert.deepEqual(selectBatchDownload(items, { limit: 20, ids: ['c', 'missing', 'a'] }).map((item) => item.id), ['a', 'c']);
  assert.deepEqual(selectBatchDownload(items, { limit: 1, ids: ['c', 'a'] }).map((item) => item.id), ['a']);
  assert.deepEqual(selectBatchDownload(items, { limit: null, ids: [] }).map((item) => item.id), []);
});

test('download quota is the total of distinct prompts, and repeats are free', () => {
  const first = applyDownloadQuota({ requestedIds: ['a', 'b'], ownedIds: [], limit: 2 });
  assert.deepEqual(first.newIds, ['a', 'b']);
  assert.equal(first.exceeded, false);
  const repeat = applyDownloadQuota({ requestedIds: ['b', 'a'], ownedIds: ['a', 'b'], limit: 2 });
  assert.deepEqual(repeat.newIds, []);
  assert.equal(repeat.exceeded, false);
  assert.deepEqual(repeat.allowed, ['b', 'a']);
  const extra = applyDownloadQuota({ requestedIds: ['c'], ownedIds: ['a', 'b'], limit: 2 });
  assert.equal(extra.exceeded, true);
  assert.equal(extra.remaining, 0);
  const mixed = applyDownloadQuota({ requestedIds: ['a', 'c'], ownedIds: ['a'], limit: 2 });
  assert.deepEqual(mixed.newIds, ['c']);
  assert.equal(mixed.exceeded, false);
  const open = applyDownloadQuota({ requestedIds: ['a', 'b', 'c'], ownedIds: ['a'], limit: null });
  assert.deepEqual(open.newIds, ['b', 'c']);
  assert.equal(open.remaining, null);
});

test('unknown products are rejected', () => {
  assert.equal(findPurchasablePlan('one-time-100'), null);
  assert.equal(findPurchasablePlan(''), null);
});
