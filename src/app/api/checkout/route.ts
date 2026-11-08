import { getAuthSession } from '~/lib/auth/session';
import { checkoutQuote, findPurchasablePlan } from '~/lib/billing/catalog';
import { checkoutSiteOrigin, createCheckout, parsePaymentMethod, productionCheckoutGate } from '~/lib/billing/checkout';
import { resolveCheckoutIdentity } from '~/lib/billing/guest';
import { runtimeEnv } from '~/lib/cloudflare/runtime-env';

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ error: 'invalid_request' }, { status: 400 }); }
  const planId = typeof payload === 'object' && payload && 'planId' in payload ? String((payload as { planId?: unknown }).planId ?? '') : '';
  const plan = findPurchasablePlan(planId);
  if (!plan) return Response.json({ error: 'invalid_plan' }, { status: 400 });
  const paymentMethod = parsePaymentMethod(typeof payload === 'object' && payload && 'paymentMethod' in payload
    ? (payload as { paymentMethod?: unknown }).paymentMethod
    : undefined);
  if (!paymentMethod || !checkoutQuote(plan, paymentMethod)) {
    return Response.json({ error: 'invalid_payment_method' }, { status: 400 });
  }
  if (productionCheckoutGate({
    secretKey: runtimeEnv('STRIPE_SECRET_KEY'),
    webhookSecret: runtimeEnv('STRIPE_WEBHOOK_SECRET'),
    productionCheckout: runtimeEnv('ENABLE_PRODUCTION_CHECKOUT'),
  }, plan.kind) === 'unavailable') {
    return Response.json({ error: 'checkout_unavailable' }, { status: 503 });
  }
  try {
    const session = await getAuthSession();
    const identity = await resolveCheckoutIdentity({ userId: session?.user?.id ?? null, request });
    const locale = typeof payload === 'object' && payload && 'locale' in payload ? String((payload as { locale?: unknown }).locale ?? 'en') : 'en';
    const result = await createCheckout({ planId, ownerId: identity.ownerId, siteUrl: checkoutSiteOrigin(request.url), locale, paymentMethod });
    const headers = new Headers();
    if (identity.setCookie) headers.set('set-cookie', identity.setCookie);
    return Response.json(result, { headers });
  } catch (error) {
    console.error('Unable to create checkout', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'checkout_unavailable' }, { status: 503 });
  }
}
