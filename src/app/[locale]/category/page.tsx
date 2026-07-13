import type { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { SUBMIT_CATEGORY_KEYS } from '~/lib/prompts/prompt-categories';
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
  unstable_setRequestLocale(normalized);
  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.categoriesIndex' });
  return buildPageMetadata({
    locale: normalized,
    path: '/category',
    title: t('seo.title'),
    description: t('seo.description'),
  });
}

export default async function CategoriesIndexPage(
  props: {
    params: Promise<{ locale: string }>;
  },
) {
  const params = await props.params;
  const { locale = '' } = params;
  unstable_setRequestLocale(locale);
  const prompts = await getPromptGallery();

  return <PageComponent locale={locale} prompts={prompts} categoryCount={SUBMIT_CATEGORY_KEYS.length} />;
}
