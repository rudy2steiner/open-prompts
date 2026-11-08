import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { AccountBilling } from '~/components/billing/AccountBilling';
import { getAuthSession } from '~/lib/auth/session';
import { GUEST_COOKIE_NAME } from '~/lib/billing/guest';
import { settleLoginLedger } from '~/lib/billing/identity';
import { loadUserBilling, userBillingPage, userBillingTab } from '~/lib/billing/account-view';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  return buildPageMetadata({ locale, path: '/billing', title: 'Billing', description: 'Your Open Prompts credits and subscription.', robots: { index: false, follow: false } });
}

export default async function Page({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; page?: string }> }) {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  const session = await getAuthSession();
  if (!session?.user?.id) redirect(locale === 'en' ? '/login' : `/${locale}/login`);
  const guest = (await cookies()).get(GUEST_COOKIE_NAME)?.value ?? null;
  await settleLoginLedger(session.user.id, guest);
  const query = await searchParams;
  const tab = userBillingTab(query.tab);
  const page = userBillingPage(query.page);
  const billing = await loadUserBilling(session.user.id, tab, page);
  return (
    <AccountBilling
      userId={session.user.id}
      locale={locale}
      tab={tab}
      page={page}
      summary={billing.summary}
      orders={billing.orders}
      credits={billing.credits}
      generations={billing.generations}
      hasNext={billing.hasNext}
    />
  );
}
