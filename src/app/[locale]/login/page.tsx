import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { getOAuthProviderFlags } from '~/lib/auth/oauth-providers';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import PageComponent from './PageComponent';

function normalizeLocale(raw: string) {
  const lower = (raw || 'en').toLowerCase();
  const normalized =
    lower === 'zh-cn' || lower === 'zh-hans' ? 'zh' : lower === 'ja-jp' ? 'ja' : lower;
  return normalized === 'en' || normalized === 'zh' || normalized === 'ja' ? normalized : 'en';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.login' });
  const title = t('seoTitle');
  const description = t('seoDescription');
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  setRequestLocale(locale);
  const authProviders = getOAuthProviderFlags();
  const prompts = await getPromptGallery();
  const previewPrompts = prompts
    .filter((p) => p.images?.[0])
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      title: p.title,
      coverSrc: p.images[0] as string,
    }));
  return (
    <Suspense fallback={null}>
      <PageComponent locale={locale} authProviders={authProviders} previewPrompts={previewPrompts} />
    </Suspense>
  );
}
