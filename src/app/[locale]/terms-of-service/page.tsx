import type { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';

import PageComponent from './PageComponent';
import {
  getFooterLanguageText,
  getIndexLanguageText,
  getTermsOfServiceLanguageText,
} from '~/configs/languageText';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';

export async function generateMetadata({
  params: { locale = 'en' },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const normalized = normalizeLocale(locale);
  unstable_setRequestLocale(normalized);
  const { title, description } = await getTermsOfServiceLanguageText();
  return buildPageMetadata({
    locale: normalized,
    path: '/terms-of-service',
    title,
    description,
  });
}

export default async function PageContent({ params: { locale = '' } }) {
  // Enable static rendering
  unstable_setRequestLocale(locale);
  const indexLanguageText = await getIndexLanguageText();
    const footerLanguageText = await getFooterLanguageText();

  const termsOfServiceLanguageText = await getTermsOfServiceLanguageText();

  return (
    <PageComponent
      locale={locale}
      termsOfServiceLanguageText={termsOfServiceLanguageText}
      footerLanguageText={footerLanguageText}
      indexLanguageText={indexLanguageText}
    >
    </PageComponent>
  )

}
