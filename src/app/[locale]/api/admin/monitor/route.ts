import { adminAccess } from '~/lib/admin/access';
import { adminQueryKey, cachedAdminPage, cachedAdminSummary } from '~/lib/admin/cache';
import {
  ADMIN_PAGE_SIZE,
  adminTab,
  listAdminEvents,
  listAdminGenerations,
  listAdminUsers,
  loadAdminSummary,
  normalizeAdminPage,
} from '~/lib/admin/monitor';
import { getAuthSession, isSessionAdmin } from '~/lib/auth/session';

const PRIVATE_HEADERS = { 'cache-control': 'private, no-store' };

export async function GET(request: Request): Promise<Response> {
  const session = await getAuthSession();
  if (adminAccess(isSessionAdmin(session)) !== 'allowed') {
    return new Response('Not found', { status: 404, headers: PRIVATE_HEADERS });
  }
  const query = new URL(request.url).searchParams;
  const tab = adminTab(query.get('tab') ?? undefined);
  const page = normalizeAdminPage(query.get('page') ?? undefined);
  const summary = await cachedAdminSummary(loadAdminSummary);
  const pageKey = adminQueryKey({ namespace: tab, tab, page, pageSize: ADMIN_PAGE_SIZE });
  const users = tab === 'users' ? await cachedAdminPage(pageKey, () => listAdminUsers(page)) : null;
  const generations = tab === 'generations' ? await cachedAdminPage(pageKey, () => listAdminGenerations(page)) : null;
  const events = tab === 'events' ? await cachedAdminPage(pageKey, () => listAdminEvents(page)) : null;
  const current = users ?? generations ?? events!;
  return Response.json({
    tab,
    page,
    summary,
    users: users?.items ?? [],
    generations: generations?.items ?? [],
    events: events?.items ?? [],
    hasNext: current.hasNext,
  }, { headers: PRIVATE_HEADERS });
}
