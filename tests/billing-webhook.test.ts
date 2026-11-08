import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import Stripe from 'stripe';
import { handleStripeWebhook } from '../src/lib/billing/webhook';
import { memoryWebhookStore, type StoredOrder } from '../src/lib/billing/webhook-store';

const secret = 'whsec_test_secret';

function signed(event: Record<string, unknown>): { body: string; signature: string } {
  const body = JSON.stringify({ object: 'event', api_version: '2024-11-20.acacia', created: 1_762_000_000, livemode: false, ...event });
  return { body, signature: Stripe.webhooks.generateTestHeaderString({ payload: body, secret }) };
}

function order(overrides: Partial<StoredOrder> = {}): StoredOrder {
  return { orderNo: 'order-1', ownerId: 'user-1', amount: 490, currency: 'usd', productId: 'one-time', credits: 245, status: 'created', ...overrides };
}

test('an invalid webhook signature does not change the balance', async () => {
  const { store, orders } = memoryWebhookStore();
  orders.set('order-1', order());
  const result = await handleStripeWebhook('{}', 'bad', store, secret);
  assert.equal(result.status, 400);
  assert.equal((await store.getAccount('user-1')).purchasedBalance, 0);
  assert.equal(orders.get('order-1')?.status, 'created');
});

test('a matching one-time payment credits once and a mismatched amount does not', async () => {
  const { store, orders } = memoryWebhookStore();
  orders.set('order-1', order());
  const paid = signed({
    id: 'evt_paid', type: 'checkout.session.completed',
    data: { object: { id: 'cs_1', object: 'checkout.session', mode: 'payment', payment_status: 'paid', amount_total: 490, currency: 'usd', metadata: { order_no: 'order-1', plan_id: 'one-time', owner_id: 'user-1', payment_method: 'card' }, payment_intent: 'pi_1' } },
  });
  const first = await handleStripeWebhook(paid.body, paid.signature, store, secret);
  const replay = await handleStripeWebhook(paid.body, paid.signature, store, secret);
  assert.equal(first.body.result, 'credited');
  assert.equal(replay.body.result, 'duplicate');
  assert.equal((await store.getAccount('user-1')).purchasedBalance, 245);
  assert.equal(orders.get('order-1')?.status, 'paid');

  orders.set('order-2', order({ orderNo: 'order-2' }));
  const mismatch = signed({
    id: 'evt_mismatch', type: 'checkout.session.completed',
    data: { object: { id: 'cs_2', object: 'checkout.session', mode: 'payment', payment_status: 'paid', amount_total: 100, currency: 'usd', metadata: { order_no: 'order-2', plan_id: 'one-time', owner_id: 'user-1', payment_method: 'card' } } },
  });
  const rejected = await handleStripeWebhook(mismatch.body, mismatch.signature, store, secret);
  assert.equal(rejected.body.result, 'ignored');
  assert.equal(orders.get('order-2')?.status, 'created');
  assert.equal((await store.getAccount('user-1')).purchasedBalance, 245);
});

test('a matching CNY WeChat payment credits once and rejects amount, currency, or method mismatches', async () => {
  const { store, orders } = memoryWebhookStore();
  orders.set('order-cny', order({ orderNo: 'order-cny', amount: 3500, currency: 'cny' }));
  const paid = signed({
    id: 'evt_cny_paid', type: 'checkout.session.completed',
    data: { object: { id: 'cs_cny', object: 'checkout.session', mode: 'payment', payment_status: 'paid', amount_total: 3500, currency: 'cny', metadata: { order_no: 'order-cny', plan_id: 'one-time', owner_id: 'user-1', payment_method: 'wechat_pay' }, payment_intent: 'pi_cny' } },
  });
  const first = await handleStripeWebhook(paid.body, paid.signature, store, secret);
  assert.equal(first.body.result, 'credited');
  assert.equal((await store.getAccount('user-1')).purchasedBalance, 245);
  assert.equal(orders.get('order-cny')?.status, 'paid');

  const mismatches = [
    { orderNo: 'order-wrong-amount', amount: 3499, currency: 'cny', paymentMethod: 'wechat_pay' },
    { orderNo: 'order-wrong-currency', amount: 3500, currency: 'usd', paymentMethod: 'wechat_pay' },
    { orderNo: 'order-missing-method', amount: 3500, currency: 'cny', paymentMethod: undefined },
    { orderNo: 'order-wrong-method', amount: 3500, currency: 'cny', paymentMethod: 'card' },
  ] as const;
  for (let index = 0; index < mismatches.length; index++) {
    const mismatch = mismatches[index]!;
    orders.set(mismatch.orderNo, order({ orderNo: mismatch.orderNo, amount: 3500, currency: 'cny' }));
    const event = signed({
      id: `evt_cny_mismatch_${index}`, type: 'checkout.session.completed',
      data: { object: { id: `cs_cny_${index}`, object: 'checkout.session', mode: 'payment', payment_status: 'paid', amount_total: mismatch.amount, currency: mismatch.currency, metadata: { order_no: mismatch.orderNo, plan_id: 'one-time', owner_id: 'user-1', ...(mismatch.paymentMethod ? { payment_method: mismatch.paymentMethod } : {}) } } },
    });
    const rejected = await handleStripeWebhook(event.body, event.signature, store, secret);
    assert.equal(rejected.body.result, 'ignored');
    assert.equal(orders.get(mismatch.orderNo)?.status, 'created');
  }
  assert.equal((await store.getAccount('user-1')).purchasedBalance, 245);
});

test('subscription credits arrive on invoice.paid and status events do not grant credits', async () => {
  const { store, subscriptions } = memoryWebhookStore();
  const checkout = signed({
    id: 'evt_sub_checkout', type: 'checkout.session.completed',
    data: { object: { id: 'cs_sub', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', amount_total: 990, currency: 'usd', metadata: { order_no: 'order-m', plan_id: 'monthly', owner_id: 'user-1' } } },
  });
  const completed = await handleStripeWebhook(checkout.body, checkout.signature, store, secret);
  assert.equal(completed.body.result, 'ignored');
  assert.equal((await store.getAccount('user-1')).monthlyBalance, 0);

  const invoice = signed({
    id: 'evt_invoice', type: 'invoice.paid',
    data: { object: { id: 'in_1', object: 'invoice', customer: 'cus_1', parent: { subscription_details: { subscription: 'sub_1', metadata: { order_no: 'order-m', plan_id: 'monthly', owner_id: 'user-1' } } }, lines: { data: [{ period: { start: 1_762_000_000, end: 1_764_592_000 } }] } } },
  });
  const granted = await handleStripeWebhook(invoice.body, invoice.signature, store, secret);
  const replay = await handleStripeWebhook(invoice.body, invoice.signature, store, secret);
  assert.equal(granted.body.result, 'credited');
  assert.equal(replay.body.result, 'duplicate');
  assert.equal((await store.getAccount('user-1')).monthlyBalance, 749);

  const deleted = signed({
    id: 'evt_deleted', type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'canceled', metadata: { plan_id: 'monthly', owner_id: 'user-1' }, items: { data: [] } } },
  });
  await handleStripeWebhook(deleted.body, deleted.signature, store, secret);
  assert.equal(subscriptions.get('sub_1'), 'canceled');
  assert.equal((await store.getAccount('user-1')).monthlyBalance, 749);

  const failed = signed({
    id: 'evt_failed', type: 'invoice.payment_failed',
    data: { object: { id: 'in_2', object: 'invoice', customer: 'cus_1', parent: { subscription_details: { subscription: 'sub_1', metadata: { plan_id: 'monthly', owner_id: 'user-1' } } } } },
  });
  await handleStripeWebhook(failed.body, failed.signature, store, secret);
  assert.equal(subscriptions.get('sub_1'), 'past_due');
  assert.equal((await store.getAccount('user-1')).monthlyBalance, 749);
});
