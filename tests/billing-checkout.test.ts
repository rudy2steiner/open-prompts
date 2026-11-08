import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createCheckout, parsePaymentMethod, productionCheckoutGate } from '../src/lib/billing/checkout';
import { checkoutQuote, findPurchasablePlan } from '../src/lib/billing/catalog';
import { stripeCheckoutParams } from '../src/lib/billing/stripe';
import { hashGuestToken, readGuestToken, resolveCheckoutIdentity, resolveGuestOwner } from '../src/lib/billing/guest';

const deps = (sessions: Array<Record<string, unknown>>, orders: Array<Record<string, unknown>>) => ({
  newId: () => 'order-1',
  createOrder: async (order: Record<string, unknown>) => { orders.push(order); },
  createStripeSession: async (input: Record<string, unknown>) => {
    sessions.push(input);
    return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' };
  },
  attachStripeSession: async () => undefined,
});

test('WeChat Pay is shown only in Chinese and its button does not expose a price', () => {
  const pricingPlans = readFileSync('src/components/billing/PricingPlans.tsx', 'utf8');
  const zhMessages = JSON.parse(readFileSync('messages/zh.json', 'utf8'));

  assert.match(pricingPlans, /locale === 'zh' && plan\.kind === 'one_time'/);
  assert.equal(zhMessages.OpenPrompts.pricingPage.wechatPay, '微信支付');
  assert.doesNotMatch(pricingPlans, /pricingPage\.wechatPay[^\n]*price/);
});

test('checkout quotes keep card prices in USD and use fixed CNY prices for WeChat Pay', () => {
  const cases = [
    ['one-time', 490, 3500],
    ['one-time-9', 990, 7100],
    ['one-time-19', 1990, 14300],
  ] as const;

  for (const [planId, usdAmount, cnyAmount] of cases) {
    const plan = findPurchasablePlan(planId);
    assert.ok(plan);
    assert.deepEqual(checkoutQuote(plan, 'card'), { amount: usdAmount, currency: 'usd', paymentMethod: 'card' });
    assert.deepEqual(checkoutQuote(plan, 'wechat_pay'), { amount: cnyAmount, currency: 'cny', paymentMethod: 'wechat_pay' });
  }

  const monthly = findPurchasablePlan('monthly');
  assert.ok(monthly);
  assert.equal(checkoutQuote(monthly, 'wechat_pay'), null);
});

test('monthly WeChat Pay is rejected before an order or Stripe session is created', async () => {
  const orders: Array<Record<string, unknown>> = [];
  const sessions: Array<Record<string, unknown>> = [];

  await assert.rejects(
    () => createCheckout({
      planId: 'monthly',
      ownerId: 'user-1',
      siteUrl: 'http://localhost:3000',
      paymentMethod: 'wechat_pay',
    }, deps(sessions, orders) as never),
    /Invalid payment method/,
  );
  assert.deepEqual(orders, []);
  assert.deepEqual(sessions, []);
});

test('payment method parsing accepts only the checkout allowlist', () => {
  const cases: Array<[unknown, 'card' | 'wechat_pay' | null]> = [
    ['card', 'card'],
    ['wechat_pay', 'wechat_pay'],
    [undefined, null],
    ['', null],
    [{}, null],
    ['alipay', null],
  ];

  for (const [value, expected] of cases) {
    assert.equal(parsePaymentMethod(value), expected);
  }
});

test('one-time checkout is a payment and monthly checkout uses inline monthly price data', async () => {
  const orders: Array<Record<string, unknown>> = [];
  const sessions: Array<Record<string, unknown>> = [];
  const oneTime = await createCheckout({ planId: 'one-time', ownerId: 'user-1', siteUrl: 'http://localhost:3000', locale: 'zh', paymentMethod: 'card' }, deps(sessions, orders) as never);
  assert.equal(oneTime.url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  assert.equal(orders[0]?.amount, 490);
  assert.equal(orders[0]?.credits, 245);
  assert.equal(sessions[0]?.mode, 'payment');
  assert.equal(sessions[0]?.successUrl, 'http://localhost:3000/zh/billing?order=order-1');

  await createCheckout({ planId: 'monthly', ownerId: 'user-1', siteUrl: 'https://open-prompts.example', locale: 'en', paymentMethod: 'card' }, deps(sessions, orders) as never);
  assert.equal(sessions[1]?.mode, 'subscription');
  assert.equal(sessions[1]?.amount, 990);
  const params = stripeCheckoutParams(sessions[1] as never);
  assert.equal(params.mode, 'subscription');
  assert.equal(params.line_items?.[0]?.price, undefined);
  assert.equal(params.line_items?.[0]?.price_data?.unit_amount, 990);
  assert.deepEqual(params.line_items?.[0]?.price_data?.recurring, { interval: 'month' });
  assert.equal(params.subscription_data?.metadata?.owner_id, 'user-1');
  assert.equal(params.metadata?.order_no, 'order-1');
});

test('Stripe checkout exposes only the explicitly selected payment method', () => {
  const base = {
    orderNo: 'order-1',
    planId: 'one-time',
    amount: 490,
    currency: 'usd' as const,
    paymentMethod: 'card' as const,
    ownerId: 'user-1',
    successUrl: 'https://open-prompts.example/billing',
    cancelUrl: 'https://open-prompts.example/pricing',
  };
  const card = stripeCheckoutParams({ ...base, mode: 'payment' });
  const wechat = stripeCheckoutParams({
    ...base,
    amount: 3500,
    currency: 'cny',
    paymentMethod: 'wechat_pay',
    mode: 'payment',
  });
  const monthly = stripeCheckoutParams({ ...base, planId: 'monthly', amount: 990, mode: 'subscription' });

  assert.deepEqual(card.payment_method_types, ['card']);
  assert.deepEqual(card.adaptive_pricing, { enabled: false });
  assert.equal(card.payment_method_options?.wechat_pay, undefined);
  assert.equal(card.metadata?.payment_method, 'card');
  assert.deepEqual(wechat.payment_method_types, ['wechat_pay']);
  assert.deepEqual(wechat.payment_method_options?.wechat_pay, { client: 'web' });
  assert.equal(wechat.metadata?.payment_method, 'wechat_pay');
  assert.deepEqual(wechat.adaptive_pricing, { enabled: false });
  assert.deepEqual(monthly.payment_method_types, ['card']);
  assert.equal(monthly.payment_method_options?.wechat_pay, undefined);
  assert.equal(monthly.subscription_data?.metadata?.payment_method, 'card');
  assert.deepEqual(monthly.adaptive_pricing, { enabled: false });
});

test('unknown plans and a closed live key do not create a session', async () => {
  await assert.rejects(() => createCheckout({ planId: 'nope', ownerId: 'user-1', siteUrl: 'http://localhost:3000', paymentMethod: 'card' }, deps([], []) as never));
  assert.equal(productionCheckoutGate({ secretKey: 'sk_live_x', productionCheckout: 'false' }, 'one_time'), 'unavailable');
  assert.equal(productionCheckoutGate({ secretKey: 'sk_live_x', productionCheckout: 'true', webhookSecret: '' }, 'monthly'), 'unavailable');
  assert.equal(productionCheckoutGate({ secretKey: 'sk_test_x' }, 'monthly'), 'ok');
  assert.equal(productionCheckoutGate({ secretKey: 'sk_live_x', productionCheckout: 'true', webhookSecret: 'whsec_test' }, 'monthly'), 'ok');
});

test('the same guest cookie keeps one guest id', async () => {
  const guests = new Map<string, string>();
  const store = {
    findGuestId: async (hash: string) => guests.get(hash) ?? null,
    createGuest: async (input: { tokenHash: string; guestId: string }) => { guests.set(input.tokenHash, input.guestId); },
  };
  const first = await resolveGuestOwner(new Request('http://localhost:3000/api/checkout'), store);
  assert.ok(first.setCookie);
  const token = readGuestToken(new Request('http://localhost/api/checkout', { headers: { cookie: first.setCookie!.split(';')[0] } }));
  assert.equal(await store.findGuestId(await hashGuestToken(token!)), first.guestId);
  const second = await resolveGuestOwner(new Request('http://localhost/api/checkout', { headers: { cookie: first.setCookie!.split(';')[0] } }), store);
  assert.equal(second.guestId, first.guestId);
  assert.equal(second.setCookie, undefined);
  const loggedIn = await resolveCheckoutIdentity({ userId: 'user-9', request: new Request('http://localhost/api/checkout'), store });
  assert.equal(loggedIn.ownerId, 'user-9');
  assert.equal(loggedIn.setCookie, undefined);
  const anonymous = await resolveCheckoutIdentity({ userId: null, request: new Request('http://localhost/api/checkout', { headers: { cookie: first.setCookie!.split(';')[0] } }), store });
  assert.equal(anonymous.ownerId, first.guestId);
});
