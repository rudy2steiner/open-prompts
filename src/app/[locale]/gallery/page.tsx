import type { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { normalizeSubmitCategoryKey } from '~/lib/prompts/prompt-categories';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

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
  unstable_setRequestLocale(normalized);
  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.galleryPage' });
  const title = t('seo.title');
  const description = t('seo.description');
  const keywords = t('seo.keywords').split(',').map((k) => k.trim()).filter(Boolean);
  return buildPageMetadata({
    locale: normalized,
    path: '/gallery',
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

  unstable_setRequestLocale(locale);
  const prompts = await getPromptGallery();
  const initialModel = searchParams?.model?.trim() || undefined;
  const initialCategory = searchParams?.category
    ? normalizeSubmitCategoryKey(searchParams.category) ?? undefined
    : undefined;

  return (
    <PageComponent
      locale={locale}
      prompts={prompts}
      initialModel={initialModel}
      initialCategory={initialCategory}
    />
  );
}
