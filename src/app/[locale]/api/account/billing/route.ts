import { getAuthSession } from '~/lib/auth/session';
import { loadUserBilling, userBillingPage, userBillingTab } from '~/lib/billing/account-view';

const PRIVATE_HEADERS = { 'cache-control': 'private, no-store' };

export async function GET(request: Request): Promise<Response> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: PRIVATE_HEADERS });
  }
  const query = new URL(request.url).searchParams;
  const tab = userBillingTab(query.get('tab') ?? undefined);
  const page = userBillingPage(query.get('page') ?? undefined);
  const billing = await loadUserBilling(session.user.id, tab, page);
  return Response.json({ tab, page, ...billing }, { headers: PRIVATE_HEADERS });
}
