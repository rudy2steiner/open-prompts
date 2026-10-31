import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HomeJsonLd } from '~/components/open-prompts/HomeJsonLd';
import { HomeSeoSections } from '~/components/open-prompts/HomeSeoSections';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

/** ISR: serve cached HTML from the edge; refresh gallery data every 5 minutes. */
export const revalidate = 300;

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale = 'en'
  } = params;

  const normalized = normalizeLocale(locale);
  setRequestLocale(normalized);
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

export default async function HomePage(props) {
  const params = await props.params;

  const {
    locale = ''
  } = params;

  setRequestLocale(locale);
  const prompts = await getPromptGallery();
  return (
    <PageComponent locale={locale} prompts={prompts}>
      <HomeJsonLd locale={locale} prompts={prompts} />
      <HomeSeoSections locale={locale} prompts={prompts} />
    </PageComponent>
  );
}
