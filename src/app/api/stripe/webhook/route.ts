import { createD1WebhookStore } from '~/lib/billing/webhook-store';
import { handleStripeWebhook } from '~/lib/billing/webhook';
import { invalidateAdminCache } from '~/lib/admin/cache';

export async function POST(request: Request): Promise<Response> {
  const store = createD1WebhookStore();
  if (!store) return Response.json({ error: 'checkout_unavailable' }, { status: 503 });
  const result = await handleStripeWebhook(await request.text(), request.headers.get('stripe-signature'), store);
  if (result.status === 200 && result.body.received) {
    invalidateAdminCache('orders');
    invalidateAdminCache('users');
  }
  return Response.json(result.body, { status: result.status });
}
