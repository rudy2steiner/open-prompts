import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { filterPromptsByModel } from '~/lib/prompts/filter-prompts';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import {
  MODEL_SEO_SLUG_LIST,
  resolveModelSeoSlug,
} from '~/lib/prompts/seo-paths';
import { buildPageMetadata, LOCALES, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

type Params = { locale: string; slug: string };

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    MODEL_SEO_SLUG_LIST.map((slug) => ({ locale, slug })),
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
  const modelName = resolveModelSeoSlug(slug);
  if (!modelName) return {};

  unstable_setRequestLocale(normalized);
  const [t, prompts] = await Promise.all([
    getTranslations({ locale: normalized, namespace: 'OpenPrompts.modelPage' }),
    getPromptGallery(),
  ]);
  const count = filterPromptsByModel(prompts, modelName).length;
  const title = t('seo.title', { model: modelName, count });
  const description = t('seo.description', { model: modelName, count });

  return buildPageMetadata({
    locale: normalized,
    path: `/model/${slug}`,
    title,
    description,
  });
}

export default async function ModelLandingPage(props: { params: Promise<Params> }) {
  const params = await props.params;

  const {
    locale = '',
    slug
  } = params;

  const modelName = resolveModelSeoSlug(slug);
  if (!modelName) notFound();

  unstable_setRequestLocale(locale);
  const prompts = await getPromptGallery();
  const filtered = filterPromptsByModel(prompts, modelName);

  return (
    <PageComponent
      locale={locale}
      slug={slug}
      modelName={modelName}
      prompts={filtered}
    />
  );
}
