import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getDb } from '~/db/client';
import {
  accountPanelFromLegacyQuery,
  accountPanelHref,
  isAccountPanelSegment,
  resolveAccountPanel,
} from '~/lib/account/account-path';
import { getAuthSession, isSessionAdmin } from '~/lib/auth/session';
import {
  countPendingReview,
  listTemplatesForAdmin,
} from '~/lib/prompts/template-record';
import { getPromptDailyTrend } from '~/lib/users/admin-user-record';
import PageComponent from '../PageComponent';

export const dynamic = 'force-dynamic';

function normalizeLocale(raw: string) {
  const lower = (raw || 'en').toLowerCase();
  const normalized =
    lower === 'zh-cn' || lower === 'zh-hans' ? 'zh' : lower === 'ja-jp' ? 'ja' : lower;
  return normalized === 'en' || normalized === 'zh' || normalized === 'ja' ? normalized : 'en';
}

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
  return { title: t('seo.title'), description: t('seo.description') };
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

  if (segment && !isAccountPanelSegment(segment)) {
    redirect(accountPanelHref(locale, 'overview'));
  }

  const initialPanel = resolveAccountPanel(segment, isAdmin);

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
