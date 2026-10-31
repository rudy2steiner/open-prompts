import { normalizeSupportedLocale } from './locales';
import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({requestLocale}) => {
  const locale = normalizeSupportedLocale(await requestLocale) ?? 'en';
  return {
    locale,
    messages: (
      await (locale === 'en'
        ? // When using Turbopack, this will enable HMR for `default`
          import('../../messages/en.json')
        : import(`../../messages/${locale}.json`))
    ).default,
  };
});

