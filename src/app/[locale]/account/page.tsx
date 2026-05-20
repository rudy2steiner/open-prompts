import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAuthSession, isAdminEmail } from '~/lib/auth/session';
import PageComponent from './PageComponent';

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
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.accountPage' });
  return { title: t('seo.title'), description: t('seo.description') };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);

  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect(loginHref(locale));
  }

  const isAdmin = isAdminEmail(session.user.email);

  return (
    <PageComponent
      locale={locale}
      isAdmin={isAdmin}
      user={{
        id: session.user.id,
        email: session.user.email ?? '',
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
