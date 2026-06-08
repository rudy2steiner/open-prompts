import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { PromptPageJsonLd } from '~/components/open-prompts/PromptPageJsonLd';
import { getPromptBySlug } from '~/lib/prompts/get-prompt-by-slug';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { buildPageMetadata, LOCALES, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';

function buildPromptMetaDescription(prompt: {
  description: string;
  prompt: string;
  title: string;
}): string {
  const desc = prompt.description?.trim();
  if (desc) return desc;
  const text = prompt.prompt?.trim() || prompt.title;
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export async function generateStaticParams() {
  const prompts = await getPromptGallery();
  return LOCALES.flatMap((locale) => prompts.map((p) => ({ locale, slug: p.id })));
}

export async function generateMetadata({
  params: { locale = 'en', slug = '' },
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const normalized = normalizeLocale(locale);
  unstable_setRequestLocale(normalized);
  const prompt = await getPromptBySlug(slug);
  if (!prompt) notFound();

  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.promptPage' });
  const title = t('seo.title', { title: prompt.title, model: prompt.model });
  const description = buildPromptMetaDescription(prompt);

  return buildPageMetadata({
    locale: normalized,
    path: `/prompt/${slug}`,
    title,
    description,
  });
}

export default async function PromptPage({
  params: { locale = '', slug = '' },
}: {
  params: { locale: string; slug: string };
}) {
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
