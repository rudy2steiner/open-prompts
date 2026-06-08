import type { Metadata } from 'next';

export const LOCALES = ['en', 'zh', 'ja'] as const;
export type AppLocale = (typeof LOCALES)[number];

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export function normalizeLocale(raw: string): AppLocale {
  const lower = (raw || 'en').toLowerCase();
  const normalized =
    lower === 'zh-cn' || lower === 'zh-hans' ? 'zh' : lower === 'ja-jp' ? 'ja' : lower;
  return normalized === 'en' || normalized === 'zh' || normalized === 'ja' ? normalized : 'en';
}

/** Path suffix without locale prefix, e.g. '' | '/gallery' */
export function buildLocalizedPath(locale: string, pathSuffix: string): string {
  const suffix = pathSuffix
    ? pathSuffix.startsWith('/')
      ? pathSuffix
      : `/${pathSuffix}`
    : '';
  if (locale === 'en') return suffix || '/';
  return `/${locale}${suffix}`;
}

export function absoluteUrl(locale: string, pathSuffix: string): string {
  const base = getSiteUrl();
  const path = buildLocalizedPath(locale, pathSuffix);
  return path === '/' ? `${base}/` : `${base}${path}`;
}

export function buildAlternates(locale: string, pathSuffix: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l] = absoluteUrl(l, pathSuffix);
  }
  languages['x-default'] = absoluteUrl('en', pathSuffix);
  return {
    canonical: absoluteUrl(locale, pathSuffix),
    languages,
  };
}

type BuildPageMetadataInput = {
  locale: string;
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  robots?: Metadata['robots'];
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const { locale, path, title, description, keywords, robots } = input;
  const alternates = buildAlternates(locale, path);
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: alternates.canonical,
      languages: alternates.languages,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: alternates.canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
