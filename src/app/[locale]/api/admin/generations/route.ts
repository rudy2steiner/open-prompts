import { getAuthSession, isSessionAdmin } from '~/lib/auth/session';
import { adminAccess } from '~/lib/admin/access';
import { loadAdminBilling } from '~/lib/billing/summary';

export async function GET(): Promise<Response> {
  const session = await getAuthSession();
  if (adminAccess(isSessionAdmin(session)) !== 'allowed') return new Response('Not found', { status: 404 });
  const billing = await loadAdminBilling();
  return Response.json({ generations: billing.generations });
}
