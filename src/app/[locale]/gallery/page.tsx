import type { Metadata } from 'next';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { normalizeSubmitCategoryKey } from '~/lib/prompts/prompt-categories';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

export async function generateMetadata({
  params: { locale = 'en' },
}: {
  params: { locale: string };
}): Promise<Metadata> {
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

export default async function GalleryPage({
  params: { locale = '' },
  searchParams,
}: {
  params: { locale: string };
  searchParams?: SearchParams;
}) {
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
