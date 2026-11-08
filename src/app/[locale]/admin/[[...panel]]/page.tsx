import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import PageComponent from '../../account/PageComponent';
import { AdminMonitorClient } from '~/components/admin/AdminMonitorClient';
import { adminAccess } from '~/lib/admin/access';
import { adminTab, listAdminEvents, listAdminGenerations, listAdminUsers, loadAdminSummary, normalizeAdminPage, type AdminEventRow, type AdminGenerationRow, type AdminPage, type AdminUserRow } from '~/lib/admin/monitor';
import { emptyBillingSnapshot, loadAdminBilling } from '~/lib/billing/summary';
import { getAuthSession, isSessionAdmin } from '~/lib/auth/session';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import { adminQueryKey, cachedAdminPage, cachedAdminSummary } from '~/lib/admin/cache';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  return buildPageMetadata({ locale, path: '/admin', title: 'Admin', description: 'Open Prompts administration.', robots: { index: false, follow: false } });
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string; panel?: string[] }>; searchParams: Promise<{ tab?: string; page?: string }> }) {
  const { locale: raw, panel } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const session = await getAuthSession();
  if (adminAccess(isSessionAdmin(session)) !== 'allowed' || !session?.user?.id) notFound();

  if (panel?.[0] === 'review' || panel?.[0] === 'prompts') {
    const adminBilling = panel[0] === 'review' ? await loadAdminBilling() : null;
    return (
      <PageComponent
        locale={locale}
        isAdmin
        surface="admin"
        initialPanel={panel[0] === 'prompts' ? 'prompts' : 'admin'}
        user={{ id: session.user.id, email: session.user.email ?? '', name: session.user.name ?? null, image: session.user.image ?? null }}
        billing={{ ...emptyBillingSnapshot(), ...adminBilling }}
      />
    );
  }

  const query = await searchParams;
  const pathTab = panel?.[0] === 'generations' || panel?.[0] === 'events' ? panel[0] : undefined;
  const tab = adminTab(pathTab ?? query.tab);
  const page = normalizeAdminPage(query.page);
  const summary = await cachedAdminSummary(loadAdminSummary);
  const pageKey = adminQueryKey({ namespace: tab, tab, page, pageSize: 20 });
  let users: AdminPage<AdminUserRow> = { items: [], page, hasNext: false };
  let generations: AdminPage<AdminGenerationRow> = { items: [], page, hasNext: false };
  let events: AdminPage<AdminEventRow> = { items: [], page, hasNext: false };
  if (tab === 'users') users = await cachedAdminPage(pageKey, () => listAdminUsers(page));
  if (tab === 'generations') generations = await cachedAdminPage(pageKey, () => listAdminGenerations(page));
  if (tab === 'events') events = await cachedAdminPage(pageKey, () => listAdminEvents(page));
  const current = tab === 'users' ? users : tab === 'generations' ? generations : events;

  return (
    <AdminMonitorClient
      locale={locale}
      initialTab={tab}
      initialPage={page}
      initialData={{
        summary,
        users: users.items,
        generations: generations.items,
        events: events.items,
        hasNext: current.hasNext,
      }}
    />
  );
}
