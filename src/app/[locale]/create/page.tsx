import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

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
  return buildPageMetadata({
    locale,
    path: '/create',
    title,
    description,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const prompts = await getPromptGallery();
  return (
    <Suspense fallback={null}>
      <PageComponent locale={locale} prompts={prompts} />
    </Suspense>
  );
}
