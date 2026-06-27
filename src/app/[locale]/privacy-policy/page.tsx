import type { Metadata } from 'next';
import { unstable_setRequestLocale } from 'next-intl/server';

import PageComponent from './PageComponent';
import {
  getFooterLanguageText,
  getIndexLanguageText,
  getPrivacyPolicyLanguageText,
} from '~/configs/languageText';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';

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
  const { title, description } = await getPrivacyPolicyLanguageText();
  return buildPageMetadata({
    locale: normalized,
    path: '/privacy-policy',
    title,
    description,
  });
}

export default async function PageContent(props) {
  const params = await props.params;

  const {
    locale = ''
  } = params;

  // Enable static rendering
  unstable_setRequestLocale(locale);
  const indexLanguageText = await getIndexLanguageText();
  const privacyPolicyLanguageText = await getPrivacyPolicyLanguageText();
  const footerLanguageText = await getFooterLanguageText();
  return (
    <PageComponent
      locale={locale}
      privacyPolicyLanguageText={privacyPolicyLanguageText}
      footerLanguageText={footerLanguageText}
      indexLanguageText={indexLanguageText}
    >
    </PageComponent>
  )
}
