import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getGalleryBootstrap } from '~/lib/prompts/gallery-bootstrap';
import { normalizeSubmitCategoryKey } from '~/lib/prompts/prompt-categories';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

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
  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.galleryPage' });
  const title = t('seo.title');
  const description = t('seo.description');
  const keywords = t('seo.keywords').split(',').map((k) => k.trim()).filter(Boolean);
  return buildPageMetadata({
    locale: normalized,
    path: '/image-prompts',
    title,
    description,
    keywords,
  });
}

type SearchParams = {
  model?: string;
  category?: string;
};

export default async function GalleryPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams?: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale = ''
  } = params;

  setRequestLocale(locale);
  const initialModel = searchParams?.model?.trim() || undefined;
  const initialCategory = searchParams?.category
    ? normalizeSubmitCategoryKey(searchParams.category) ?? undefined
    : undefined;

  const bootstrap = await getGalleryBootstrap({ model: initialModel, category: initialCategory });
  const prompts = bootstrap.items;

  return (
    <PageComponent
      key={`${locale}:${initialModel ?? 'all'}:${initialCategory ?? 'all'}`}
      locale={locale}
      prompts={prompts}
      initialTotal={bootstrap.total}
      initialModels={bootstrap.models}
      catalogComplete={false}
      initialModel={initialModel}
      initialCategory={initialCategory}
    />
  );
}
