import Stripe from 'stripe';
import { runtimeEnv } from '~/lib/cloudflare/runtime-env';
import { checkoutQuote, findPurchasablePlan } from './catalog';
import { parsePaymentMethod } from './checkout';
import type { WebhookStore } from './webhook-store';

export type WebhookResult = { status: number; body: { received?: true; result?: 'credited' | 'duplicate' | 'ignored'; error?: string } };

function stripeId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value && typeof (value as { id: unknown }).id === 'string') return (value as { id: string }).id;
  return '';
}

async function verifyEvent(rawBody: string, signature: string | null, secret: string | undefined): Promise<Stripe.Event | null> {
  if (!secret || !signature) return null;
  try {
    const key = runtimeEnv('STRIPE_SECRET_KEY')?.trim() || 'sk_test_webhook_verification';
    const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
    return await stripe.webhooks.constructEventAsync(rawBody, signature, secret);
  } catch {
    return null;
  }
}

export async function handleStripeWebhook(rawBody: string, signature: string | null, store: WebhookStore, secret = runtimeEnv('STRIPE_WEBHOOK_SECRET')?.trim()): Promise<WebhookResult> {
  const event = await verifyEvent(rawBody, signature, secret);
  if (!event) return { status: 400, body: { error: 'invalid_signature' } };
  try {
    if (event.type === 'checkout.session.completed') return await settleCheckout(event, store);
    if (event.type === 'invoice.paid') return await settleInvoice(event, store);
    if (event.type === 'invoice.payment_failed' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      return await syncSubscription(event, store);
    }
    return { status: 200, body: { received: true, result: 'ignored' } };
  } catch {
    return { status: 400, body: { error: 'invalid_event' } };
  }
}

async function settleCheckout(event: Stripe.Event, store: WebhookStore): Promise<WebhookResult> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode === 'subscription') {
    await store.finishEvent(event.id, event.type, 'ignored');
    return { status: 200, body: { received: true, result: 'ignored' } };
  }
  const orderNo = session.metadata?.order_no ?? '';
  const plan = findPurchasablePlan(session.metadata?.plan_id ?? '');
  const paymentMethod = parsePaymentMethod(session.metadata?.payment_method);
  const quote = plan && paymentMethod ? checkoutQuote(plan, paymentMethod) : null;
  const order = orderNo ? await store.getOrder(orderNo) : null;
  const matches = Boolean(order && plan && quote && order.productId === plan.id && order.amount === quote.amount
    && order.currency === quote.currency && order.credits === plan.credits
    && session.payment_status === 'paid' && session.amount_total === order.amount && session.currency === order.currency);
  if (!matches || !order) {
    await store.finishEvent(event.id, event.type, 'ignored');
    return { status: 200, body: { received: true, result: 'ignored' } };
  }
  const claim = await store.claimEvent(event.id, event.type);
  if (claim === 'processed') return { status: 200, body: { received: true, result: 'duplicate' } };
  const result = await store.addPurchased({
    ownerId: order.ownerId,
    credits: order.credits,
    referenceId: order.orderNo,
    idempotencyKey: `purchase:${order.orderNo}`,
    paymentIntentId: stripeId(session.payment_intent) || null,
  });
  await store.finishEvent(event.id, event.type, 'processed');
  return { status: 200, body: { received: true, result } };
}

async function settleInvoice(event: Stripe.Event, store: WebhookStore): Promise<WebhookResult> {
  const invoice = event.data.object as Stripe.Invoice & {
    parent?: { subscription_details?: { subscription?: unknown; metadata?: Record<string, string> } };
    subscription?: unknown;
    lines?: { data?: Array<{ period?: { start?: number; end?: number } }> };
  };
  const details = invoice.parent?.subscription_details;
  const metadata = details?.metadata ?? {};
  const plan = findPurchasablePlan(metadata.plan_id ?? '');
  const ownerId = metadata.owner_id ?? '';
  const subscriptionId = stripeId(details?.subscription) || stripeId(invoice.subscription);
  const customerId = stripeId(invoice.customer);
  const lines = invoice.lines?.data ?? [];
  const periodEnd = Math.max(0, ...lines.map((line) => line.period?.end ?? 0));
  if (!plan || plan.kind !== 'monthly' || !ownerId || !subscriptionId || !customerId || periodEnd <= 0) throw new Error('Invalid subscription invoice');
  const claim = await store.claimEvent(event.id, event.type);
  if (claim === 'processed') return { status: 200, body: { received: true, result: 'duplicate' } };
  const result = await store.setMonthly({
    ownerId,
    subscriptionId,
    customerId,
    credits: plan.credits,
    periodEndMs: periodEnd * 1000,
    orderNo: metadata.order_no ?? '',
    idempotencyKey: `subscription:${subscriptionId}:${periodEnd}`,
  });
  await store.finishEvent(event.id, event.type, 'processed');
  return { status: 200, body: { received: true, result } };
}

async function syncSubscription(event: Stripe.Event, store: WebhookStore): Promise<WebhookResult> {
  const claim = await store.claimEvent(event.id, event.type);
  if (claim === 'processed') return { status: 200, body: { received: true, result: 'duplicate' } };
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice & { parent?: { subscription_details?: { subscription?: unknown; metadata?: Record<string, string> } }; subscription?: unknown };
    const metadata = invoice.parent?.subscription_details?.metadata ?? {};
    const subscriptionId = stripeId(invoice.parent?.subscription_details?.subscription) || stripeId(invoice.subscription);
    if (metadata.owner_id && subscriptionId) {
      await store.syncSubscription({ ownerId: metadata.owner_id, subscriptionId, customerId: stripeId(invoice.customer), status: 'past_due', periodEndMs: null });
    }
  } else {
    const subscription = event.data.object as Stripe.Subscription & { metadata?: Record<string, string> };
    const ownerId = subscription.metadata?.owner_id ?? '';
    const subscriptionId = subscription.id;
    if (!ownerId || !subscriptionId) throw new Error('Invalid subscription event');
    await store.syncSubscription({
      ownerId,
      subscriptionId,
      customerId: stripeId(subscription.customer),
      status: event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status === 'active' ? 'active' : 'past_due',
      periodEndMs: typeof subscription.current_period_end === 'number' ? subscription.current_period_end * 1000 : null,
    });
  }
  await store.finishEvent(event.id, event.type, 'processed');
  return { status: 200, body: { received: true, result: 'ignored' } };
}
