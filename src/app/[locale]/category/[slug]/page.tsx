import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { filterPromptsByCategory } from '~/lib/prompts/filter-prompts';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import {
  CATEGORY_SEO_SLUG_LIST,
  resolveCategorySeoSlug,
} from '~/lib/prompts/seo-paths';
import { buildPageMetadata, LOCALES, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

type Params = { locale: string; slug: string };

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    CATEGORY_SEO_SLUG_LIST.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata(
  props: {
    params: Promise<Params>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale = 'en',
    slug
  } = params;

  const normalized = normalizeLocale(locale);
  const categoryKey = resolveCategorySeoSlug(slug);
  if (!categoryKey) return {};

  unstable_setRequestLocale(normalized);
  const [t, tCategory, prompts] = await Promise.all([
    getTranslations({ locale: normalized, namespace: 'OpenPrompts.categoryPage' }),
    getTranslations({ locale: normalized, namespace: 'OpenPrompts.submitPage' }),
    getPromptGallery(),
  ]);
  const categoryName = tCategory(`categories.${categoryKey}`);
  const count = filterPromptsByCategory(prompts, categoryKey).length;
  const title = t('seo.title', { category: categoryName, count });
  const description = t('seo.description', { category: categoryName, count });

  return buildPageMetadata({
    locale: normalized,
    path: `/category/${slug}`,
    title,
    description,
  });
}

export default async function CategoryLandingPage(
  props: {
    params: Promise<Params>;
  }
) {
  const params = await props.params;

  const {
    locale = '',
    slug
  } = params;

  const categoryKey = resolveCategorySeoSlug(slug);
  if (!categoryKey) notFound();

  unstable_setRequestLocale(locale);
  const prompts = await getPromptGallery();
  const filtered = filterPromptsByCategory(prompts, categoryKey);

  return (
    <PageComponent
      locale={locale}
      slug={slug}
      categoryKey={categoryKey}
      prompts={filtered}
    />
  );
}
