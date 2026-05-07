import {unstable_setRequestLocale} from 'next-intl/server';
import {getIndexLanguageText, getFooterLanguageText} from "~/configs/languageText";
import PageComponent from "./gallery/PageComponent";

export default async function HomePage({params: {locale = ''}}) {
  unstable_setRequestLocale(locale);
  const [indexLanguageText, footerLanguageText] = await Promise.all([
    getIndexLanguageText(),
    getFooterLanguageText(),
  ]);
  return (
    <PageComponent
      locale={locale}
      indexLanguageText={indexLanguageText}
      footerLanguageText={footerLanguageText}
    />
  );
}
