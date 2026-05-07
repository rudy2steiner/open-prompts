import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({requestLocale}) => {
  const raw = ((await requestLocale) || 'en').toLowerCase();
  const normalized = raw === 'zh-cn' || raw === 'zh-hans' ? 'zh' : raw === 'ja-jp' ? 'ja' : raw;
  const locale = normalized === 'en' || normalized === 'zh' || normalized === 'ja' ? normalized : 'en';
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

