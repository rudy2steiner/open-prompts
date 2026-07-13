import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { PromptPageJsonLd } from '~/components/open-prompts/PromptPageJsonLd';
import { getPromptBySlug } from '~/lib/prompts/get-prompt-by-slug';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { buildPageMetadata, LOCALES, normalizeLocale } from '~/lib/seo/metadata';
import { buildPromptPageTitle, buildPromptSeoDescription } from '~/lib/seo/titles';
import PageComponent from './PageComponent';

export async function generateStaticParams() {
  const prompts = await getPromptGallery();
  return LOCALES.flatMap((locale) => prompts.map((p) => ({ locale, slug: p.id })));
}

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string; slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale = 'en',
    slug = ''
  } = params;

  const normalized = normalizeLocale(locale);
  unstable_setRequestLocale(normalized);
  const prompt = await getPromptBySlug(slug);
  if (!prompt) notFound();

  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.promptPage' });
  const title = buildPromptPageTitle(prompt.title, prompt.model, normalized);
  const description = buildPromptSeoDescription(prompt, normalized, t('seo.description'));
  const keywords = [
    'image prompts',
    `${prompt.model} prompt`,
    ...prompt.tags.slice(0, 5),
  ].filter(Boolean);

  return buildPageMetadata({
    locale: normalized,
    path: `/prompt/${slug}`,
    title,
    description,
    keywords,
  });
}

export default async function PromptPage(
  props: {
    params: Promise<{ locale: string; slug: string }>;
  }
) {
  const params = await props.params;

  const {
    locale = '',
    slug = ''
  } = params;

  unstable_setRequestLocale(locale);
  const prompt = await getPromptBySlug(slug);
  if (!prompt) notFound();

  return (
    <>
      <PromptPageJsonLd locale={locale} prompt={prompt} />
      <PageComponent locale={locale} prompt={prompt} />
    </>
  );
}
