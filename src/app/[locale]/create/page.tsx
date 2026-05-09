import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import PageComponent from './PageComponent';

function normalizeLocale(raw: string) {
  const lower = (raw || 'en').toLowerCase();
  const normalized = lower === 'zh-cn' || lower === 'zh-hans' ? 'zh' : lower === 'ja-jp' ? 'ja' : lower;
  return normalized === 'en' || normalized === 'zh' || normalized === 'ja' ? normalized : 'en';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'OpenPrompts' });
  const title = t('createPage.seo.title');
  const description = t('createPage.seo.description');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  return (
    <Suspense fallback={null}>
      <PageComponent locale={locale} />
    </Suspense>
  );
}
