/** 路由、界面选择、格式化和 SEO 共用同一份语言清单。 */
export const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English', zh: '简体中文', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português',
};
export const LOCALE_TAGS: Record<SupportedLocale, string> = {
  en: 'en-US', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR',
};
export function normalizeSupportedLocale(raw: string | null | undefined): SupportedLocale | null {
  const base = raw?.trim().toLowerCase().replace(/_/g, '-').split('-')[0];
  return SUPPORTED_LOCALES.find(locale => locale === base) ?? null;
}
export function localeTagFor(raw: string) {
  return LOCALE_TAGS[normalizeSupportedLocale(raw) ?? 'en'];
}
