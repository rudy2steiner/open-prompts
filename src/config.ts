import { SUPPORTED_LOCALES, LOCALE_NAMES, LOCALE_TAGS } from './i18n/locales';
import {Pathnames} from 'next-intl/routing';

export const locales = SUPPORTED_LOCALES;
export const languages = locales.map(lang => ({ code: LOCALE_TAGS[lang], lang, language: LOCALE_NAMES[lang] }));

export const pathnames = {
  '/': '/',
} satisfies Pathnames<typeof locales>;

// Use the default: `always`，设置为 as-needed可不显示默认路由
export const localePrefix = 'as-needed';

export type AppPathnames = keyof typeof pathnames;

export const getLanguageByLang = (lang) => {
  for (let i = 0; i < languages.length; i++) {
    if (lang == languages[i].lang) {
      return  languages[i];
    }
  }
}

export const getEditorLocale = (lang) => {
  if (lang == 'zh') {
    return 'zh-cn';
  }else if(lang==='pt'){
    return 'pt-br';
  }else if(lang==''){
    return 'en';
  }
  return lang;
}
