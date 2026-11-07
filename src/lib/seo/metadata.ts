import { SUPPORTED_LOCALES, normalizeSupportedLocale } from '~/i18n/locales';
import type { Metadata } from 'next';
import { buildFullPageTitle, clampMetaDescription } from './titles';

export const LOCALES = SUPPORTED_LOCALES;
export type AppLocale = (typeof LOCALES)[number];

const PRODUCTION_SITE_URL = 'https://www.open-prompts.com';

function configuredSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0';
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || loopback) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  return configuredSiteUrl() ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : PRODUCTION_SITE_URL);
}

export function normalizeLocale(raw: string): AppLocale {
  return normalizeSupportedLocale(raw) ?? 'en';
}

/** Path suffix without locale prefix, e.g. '' | '/image-prompts' */
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

type PageOgImage = {
  url: string;
  width: number;
  height: number;
  alt?: string;
};

type BuildPageMetadataInput = {
  locale: string;
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  robots?: Metadata['robots'];
  image?: PageOgImage;
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const { locale, path, title, description, keywords, robots, image } = input;
  const alternates = buildAlternates(locale, path);
  const fullTitle = buildFullPageTitle(title, locale);
  const safeDescription = clampMetaDescription(description, locale);
  const cover = image ?? { url: '/og-home.jpg', width: 1200, height: 630 };
  const ogImage = { ...cover, alt: cover.alt ?? fullTitle };
  return {
    title: { absolute: fullTitle },
    description: safeDescription,
    ...(keywords?.length ? { keywords } : {}),
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: alternates.canonical,
      languages: alternates.languages,
    },
    openGraph: {
      title: fullTitle,
      description: safeDescription,
      type: 'website',
      url: alternates.canonical,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: safeDescription,
      images: [ogImage.url],
    },
  };
}
