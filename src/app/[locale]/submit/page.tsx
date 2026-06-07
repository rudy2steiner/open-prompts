import type { Metadata } from 'next';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { SUBMIT_QUICK_TAGS } from '~/lib/prompts/prompt-categories';
import PageComponent from './PageComponent';
import './submit-page.css';

function normalizeLocale(raw: string) {
  const lower = (raw || 'en').toLowerCase();
  const normalized =
    lower === 'zh-cn' || lower === 'zh-hans' ? 'zh' : lower === 'ja-jp' ? 'ja' : lower;
  return normalized === 'en' || normalized === 'zh' || normalized === 'ja' ? normalized : 'en';
}

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
  return {
    title,
    description,
    keywords,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
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
