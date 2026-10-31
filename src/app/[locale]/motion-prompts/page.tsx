import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  },
): Promise<Metadata> {
  const params = await props.params;
  const { locale = 'en' } = params;
  const normalized = normalizeLocale(locale);
  setRequestLocale(normalized);
  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.promptMotionPage' });
  const keywords = t('seo.keywords').split(',').map((k) => k.trim()).filter(Boolean);
  const metadata = buildPageMetadata({
    locale: normalized,
    path: '/motion-prompts',
    title: t('seo.title'),
    description: t('seo.description'),
    keywords,
  });
  const title = `${t('seo.title')} | Open Prompts`;
  return {
    ...metadata,
    title: { absolute: title },
    openGraph: { ...metadata.openGraph, title },
    twitter: { ...metadata.twitter, title },
    referrer: 'no-referrer',
  };
}

export default async function PromptMotionPage(
  props: {
    params: Promise<{ locale: string }>;
  },
) {
  const params = await props.params;
  const { locale = '' } = params;
  setRequestLocale(locale);
  return <PageComponent locale={locale} />;
}
