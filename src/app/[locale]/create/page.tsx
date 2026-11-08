import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';
import { getDefaultProviderName } from '~/lib/generation/registry';

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale: raw } = await params;
  const query = await searchParams;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const prompts = await getPromptGallery();
  return <PageComponent
    locale={locale}
    prompts={prompts}
    provider={getDefaultProviderName().toLowerCase()}
    initialQuery={{
      template: firstValue(query.template),
      templateId: firstValue(query.templateId),
      id: firstValue(query.id),
      demo: firstValue(query.demo),
      mode: firstValue(query.mode),
    }}
  />;
}
