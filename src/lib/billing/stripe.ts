import Stripe from 'stripe';
import { runtimeEnv } from '~/lib/cloudflare/runtime-env';
import type { CheckoutCurrency, PaymentMethod } from './catalog';

export type StripeSessionInput = {
  orderNo: string;
  planId: string;
  amount: number;
  currency: CheckoutCurrency;
  paymentMethod: PaymentMethod;
  mode: 'payment' | 'subscription';
  ownerId: string;
  successUrl: string;
  cancelUrl: string;
};

export type StripeSessionResult = { id: string; url: string | null };

export function getStripeClient(key = runtimeEnv('STRIPE_SECRET_KEY')?.trim()): Stripe {
  if (!key) throw new Error('Stripe is not configured');
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

export function stripeCheckoutParams(input: StripeSessionInput): Stripe.Checkout.SessionCreateParams {
  const metadata = {
    order_no: input.orderNo,
    plan_id: input.planId,
    owner_id: input.ownerId,
    payment_method: input.paymentMethod,
  };
  return {
    mode: input.mode,
    adaptive_pricing: { enabled: false },
    payment_method_types: [input.paymentMethod],
    ...(input.paymentMethod === 'wechat_pay'
      ? { payment_method_options: { wechat_pay: { client: 'web' } } }
      : {}),
    line_items: [{
      quantity: 1,
      price_data: {
        currency: input.currency,
        unit_amount: input.amount,
        product_data: { name: input.planId },
        ...(input.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
      },
    }],
    metadata,
    ...(input.mode === 'subscription'
      ? { subscription_data: { metadata } }
      : {}),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  };
}

export async function createStripeCheckoutSession(input: StripeSessionInput): Promise<StripeSessionResult> {
  const session = await getStripeClient().checkout.sessions.create(stripeCheckoutParams(input));
  return { id: session.id, url: session.url };
}
