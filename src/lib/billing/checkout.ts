import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { orders } from '~/db/schema';
import { checkoutQuote, findPurchasablePlan, type CheckoutCurrency, type PaymentMethod, type PlanKind } from './catalog';
import { createStripeCheckoutSession, type StripeSessionInput, type StripeSessionResult } from './stripe';

export type PendingOrder = {
  orderNo: string;
  ownerId: string;
  planId: string;
  amount: number;
  currency: CheckoutCurrency;
  credits: number;
};

type CheckoutDependencies = {
  newId(): string;
  createOrder(order: PendingOrder): Promise<void>;
  createStripeSession(input: StripeSessionInput): Promise<StripeSessionResult>;
  attachStripeSession(orderNo: string, sessionId: string): Promise<void>;
};

export function checkoutSiteOrigin(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

export function parsePaymentMethod(value: unknown): PaymentMethod | null {
  return value === 'card' || value === 'wechat_pay' ? value : null;
}

export function productionCheckoutGate(env: {
  secretKey?: string;
  webhookSecret?: string;
  productionCheckout?: string;
}, kind: PlanKind): 'ok' | 'unavailable' {
  const key = env.secretKey?.trim() ?? '';
  if (key.startsWith('sk_live_') && env.productionCheckout !== 'true') return 'unavailable';
  if (key.startsWith('sk_live_') && kind === 'monthly' && !env.webhookSecret?.trim()) return 'unavailable';
  return 'ok';
}

async function defaultDependencies(): Promise<CheckoutDependencies> {
  const db = getDb();
  if (!db) throw new Error('Database is unavailable');
  return {
    newId: () => crypto.randomUUID(),
    createOrder: async (order) => {
      await db.insert(orders).values({
        orderNo: order.orderNo,
        ownerId: order.ownerId,
        amount: order.amount,
        currency: order.currency,
        productId: order.planId,
        productName: order.planId,
        credits: order.credits,
        status: 'created',
      });
    },
    createStripeSession: createStripeCheckoutSession,
    attachStripeSession: async (orderNo, sessionId) => {
      await db.update(orders).set({ stripeSessionId: sessionId, updatedAt: new Date() }).where(eq(orders.orderNo, orderNo));
    },
  };
}

export async function createCheckout(input: {
  planId: string;
  ownerId: string;
  siteUrl: string;
  locale?: string;
  paymentMethod: PaymentMethod;
}, dependencies?: CheckoutDependencies): Promise<{ url: string }> {
  const plan = findPurchasablePlan(input.planId);
  if (!plan) throw new Error('Unknown pricing plan');
  const quote = checkoutQuote(plan, input.paymentMethod);
  if (!quote) throw new Error('Invalid payment method');
  const deps = dependencies ?? await defaultDependencies();
  const orderNo = deps.newId();
  await deps.createOrder({
    orderNo,
    ownerId: input.ownerId,
    planId: plan.id,
    amount: quote.amount,
    currency: quote.currency,
    credits: plan.credits,
  });
  const prefix = !input.locale || input.locale === 'en' ? '' : `/${input.locale}`;
  const session = await deps.createStripeSession({
    orderNo,
    planId: plan.id,
    amount: quote.amount,
    currency: quote.currency,
    paymentMethod: quote.paymentMethod,
    mode: plan.kind === 'monthly' ? 'subscription' : 'payment',
    ownerId: input.ownerId,
    successUrl: `${input.siteUrl}${prefix}/billing?order=${encodeURIComponent(orderNo)}`,
    cancelUrl: `${input.siteUrl}${prefix}/pricing?checkout=cancelled`,
  });
  if (!session.url?.startsWith('https://checkout.stripe.com/')) throw new Error('Stripe checkout URL is unavailable');
  await deps.attachStripeSession(orderNo, session.id);
  return { url: session.url };
}
