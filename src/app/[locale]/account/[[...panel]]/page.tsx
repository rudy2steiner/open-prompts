import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getDb } from '~/db/client';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import {
  accountPanelFromLegacyQuery,
  accountPanelHref,
  isAccountPanelSegment,
  resolveAccountPanel,
} from '~/lib/account/account-path';
import { getAuthSession, isSessionAdmin } from '~/lib/auth/session';
import { GUEST_COOKIE_NAME } from '~/lib/billing/guest';
import { settleLoginLedger } from '~/lib/billing/identity';
import { loadBillingSnapshot } from '~/lib/billing/summary';
import {
  countPendingReview,
  listTemplatesForAdmin,
} from '~/lib/prompts/template-record';
import { getPromptDailyTrend } from '~/lib/users/admin-user-record';
import PageComponent from '../PageComponent';

export const dynamic = 'force-dynamic';

function loginHref(locale: string) {
  return locale === 'en' ? '/login' : `/${locale}/login`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; panel?: string[] }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.accountPage' });
  return buildPageMetadata({
    locale,
    path: '/account',
    title: t('seo.title'),
    description: t('seo.description'),
    robots: { index: false, follow: false },
  });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; panel?: string[] }>;
  searchParams: Promise<{ panel?: string }>;
}) {
  const { locale: raw, panel: panelSegments } = await params;
  const { panel: legacyPanelParam } = await searchParams;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);

  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect(loginHref(locale));
  }

  const email = session.user.email ?? '';
  const isAdmin = isSessionAdmin(session);

  const segment = panelSegments?.[0];

  if (legacyPanelParam && !segment) {
    const legacyPanel = accountPanelFromLegacyQuery(legacyPanelParam);
    redirect(accountPanelHref(locale, legacyPanel));
  }

  if (segment === 'admin' || segment === 'users') {
    redirect(locale === 'en' ? '/admin' : `/${locale}/admin`);
  }

  if (segment === 'prompts') {
    if (!isAdmin) notFound();
    redirect(locale === 'en' ? '/admin/prompts' : `/${locale}/admin/prompts`);
  }

  if (!segment || segment === 'credits' || segment === 'subscription') {
    const guest = (await cookies()).get(GUEST_COOKIE_NAME)?.value ?? null;
    await settleLoginLedger(session.user.id, guest);
    redirect(locale === 'en' ? '/billing' : `/${locale}/billing`);
  }

  if (segment && !isAccountPanelSegment(segment)) {
    redirect(accountPanelHref(locale, 'overview'));
  }

  const initialPanel = resolveAccountPanel(segment, isAdmin);

  const guest = (await cookies()).get(GUEST_COOKIE_NAME)?.value ?? null;
  await settleLoginLedger(session.user.id, guest);
  const billing = await loadBillingSnapshot(session.user.id);
  let initialAdmin: Awaited<ReturnType<typeof loadInitialAdmin>> = null;
  if (isAdmin && initialPanel === 'admin') {
    initialAdmin = await loadInitialAdmin();
  }

  return (
    <Suspense fallback={null}>
      <PageComponent
        locale={locale}
        isAdmin={isAdmin}
        initialPanel={initialPanel}
        billing={billing}
        user={{
          id: session.user.id,
          email,
          name: session.user.name ?? null,
          image: session.user.image ?? null,
        }}
        initialAdmin={initialAdmin}
      />
    </Suspense>
  );
}

async function loadInitialAdmin() {
  const db = getDb();
  if (!db) return null;
  try {
    const [result, pendingCount] = await Promise.all([
      listTemplatesForAdmin(db, { limit: 20, offset: 0 }),
      countPendingReview(db),
    ]);
    let promptsDailyTrend: Awaited<ReturnType<typeof getPromptDailyTrend>> = [];
    try {
      promptsDailyTrend = await getPromptDailyTrend(db, 30);
    } catch (trendErr) {
      console.error('[account:admin-prefetch:trend]', trendErr);
    }
    return { ...result, pendingCount, promptsDailyTrend };
  } catch (e) {
    console.error('[account:admin-prefetch]', e);
    return null;
  }
}
