import type { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { HomeJsonLd } from '~/components/open-prompts/HomeJsonLd';
import { HomeSeoSections } from '~/components/open-prompts/HomeSeoSections';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

export async function generateMetadata({
  params: { locale = 'en' },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const normalized = normalizeLocale(locale);
  unstable_setRequestLocale(normalized);
  const [t, prompts] = await Promise.all([
    getTranslations({ locale: normalized, namespace: 'OpenPrompts.homePage' }),
    getPromptGallery(),
  ]);
  const title = t('seo.title');
  const description = t('seo.description', { count: prompts.length });
  const keywords = t('seo.keywords').split(',').map((k) => k.trim()).filter(Boolean);
  return buildPageMetadata({
    locale: normalized,
    path: '',
    title,
    description,
    keywords,
  });
}

export default async function HomePage({ params: { locale = '' } }) {
  unstable_setRequestLocale(locale);
  const prompts = await getPromptGallery();
  return (
    <PageComponent locale={locale} prompts={prompts}>
      <HomeJsonLd locale={locale} prompts={prompts} />
      <HomeSeoSections locale={locale} prompts={prompts} />
    </PageComponent>
  );
}
