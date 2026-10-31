import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { SUBMIT_QUICK_TAGS } from '~/lib/prompts/prompt-categories';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import PageComponent from './PageComponent';
import './submit-page.css';

type SubmitMessages = {
  quickTags?: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.submitPage' });
  const title = t('seo.title');
  const description = t('seo.description');
  const keywords = t('seo.keywords').split(',').map((k) => k.trim()).filter(Boolean);
  return buildPageMetadata({
    locale,
    path: '/submit',
    title,
    description,
    keywords,
  });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const messages = await getMessages();
  const op = (messages as { OpenPrompts?: { submitPage?: SubmitMessages } }).OpenPrompts;
  const submitPage = op?.submitPage;
  const quickTags = submitPage?.quickTags?.length ? submitPage.quickTags : [...SUBMIT_QUICK_TAGS];

  return (
    <Suspense fallback={null}>
      <PageComponent locale={locale} quickTags={quickTags} />
    </Suspense>
  );
}
