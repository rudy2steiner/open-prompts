import {unstable_setRequestLocale} from 'next-intl/server';

import PageComponent from './PageComponent';
import {getIndexLanguageText, getFooterLanguageText, getPrivacyPolicyLanguageText} from "~/configs/languageText";

export default async function PageContent({params: {locale = ''}}) {
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
