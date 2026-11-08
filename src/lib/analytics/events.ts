import type { CheckoutCurrency, PaymentMethod } from '~/lib/billing/catalog';

export const PRICING_CLICK = 'Pricing Plan Click';

export type PricingClickProperties = {
  plan: string;
  price: string;
  locale: string;
  page: string;
  billingType: string;
  paymentMethod: string;
  currency: string;
};

export type AnalyticsEventInput = {
  id: string;
  name: typeof PRICING_CLICK;
  locale: string;
  page: string;
  subject: string;
  properties: PricingClickProperties;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, max: number, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}

export function buildPricingClickEvent(input: { planId: string; price: string; locale: string; page: string; billingType: 'one_time' | 'monthly'; paymentMethod: PaymentMethod; currency: CheckoutCurrency }): { name: typeof PRICING_CLICK; properties: PricingClickProperties } {
  return {
    name: PRICING_CLICK,
    properties: {
      plan: input.planId,
      price: input.price,
      locale: input.locale,
      page: input.page,
      billingType: input.billingType,
      paymentMethod: input.paymentMethod,
      currency: input.currency,
    },
  };
}

export function parseAnalyticsEvent(value: unknown): AnalyticsEventInput | null {
  const body = record(value);
  const properties = record(body?.properties);
  if (!body || !properties || typeof body.id !== 'string' || body.id.length < 1 || body.id.length > 64) return null;
  if (body.name !== PRICING_CLICK) return null;
  const plan = text(properties.plan, 40);
  if (!plan) return null;
  const clean: PricingClickProperties = {
    plan,
    price: text(properties.price, 40),
    locale: text(properties.locale, 16, 'en'),
    page: text(properties.page, 256, '/'),
    billingType: text(properties.billingType, 20),
    paymentMethod: text(properties.paymentMethod, 20),
    currency: text(properties.currency, 8),
  };
  return { id: body.id, name: PRICING_CLICK, locale: clean.locale, page: clean.page, subject: plan, properties: clean };
}

export function queuePricingClick(input: { planId: string; price: string; locale: string; page: string; billingType: 'one_time' | 'monthly'; paymentMethod: PaymentMethod; currency: CheckoutCurrency }) {
  const detail = buildPricingClickEvent(input);
  const payload = JSON.stringify({ id: crypto.randomUUID(), ...detail });
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }))) return;
  } catch {
    // The click still continues. Tracking never blocks checkout.
  }
  void fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
}
