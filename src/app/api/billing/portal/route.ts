import { getAuthSession } from '~/lib/auth/session';
import { loadBillingSnapshot } from '~/lib/billing/summary';
import { checkoutSiteOrigin } from '~/lib/billing/checkout';
import { createPortalLink } from '~/lib/billing/portal';
import { getStripeClient } from '~/lib/billing/stripe';

export async function POST(request: Request): Promise<Response> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: 'not_found' }, { status: 404 });
  const snapshot = await loadBillingSnapshot(userId);
  const origin = checkoutSiteOrigin(request.url);
  const result = await createPortalLink({
    customerId: snapshot.subscription?.customerId ?? null,
    returnUrl: `${origin}/billing`,
    createSession: async (customerId, returnUrl) => {
      const portal = await getStripeClient().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
      return portal.url;
    },
  });
  if (result === 'rejected') return Response.json({ error: 'customer_not_found' }, { status: 404 });
  return Response.json(result);
}
