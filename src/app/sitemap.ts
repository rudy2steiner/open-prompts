import type { MetadataRoute } from 'next';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import {
  CATEGORY_SEO_SLUG_LIST,
  MODEL_SEO_SLUG_LIST,
} from '~/lib/prompts/seo-paths';
import { absoluteUrl } from '~/lib/seo/metadata';

const PUBLIC_PATHS = [
  '',
  '/gallery',
  '/submit',
  '/create',
  '/login',
  '/privacy-policy',
  '/terms-of-service',
] as const;

const LOCALES = ['en', 'zh', 'ja'] as const;

function staticEntries(now: Date): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map((path) => ({
      url: absoluteUrl(locale, path),
      lastModified: now,
      changeFrequency: path === '' || path === '/gallery' ? ('daily' as const) : ('weekly' as const),
      priority: path === '' ? 1 : path === '/gallery' ? 0.9 : 0.7,
    })),
  );
}

function taxonomyEntries(now: Date): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) => [
    ...MODEL_SEO_SLUG_LIST.map((slug) => ({
      url: absoluteUrl(locale, `/model/${slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
    ...CATEGORY_SEO_SLUG_LIST.map((slug) => ({
      url: absoluteUrl(locale, `/category/${slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    })),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const prompts = await getPromptGallery();

  const promptEntries = LOCALES.flatMap((locale) =>
    prompts.map((p) => ({
      url: absoluteUrl(locale, `/prompt/${p.id}`),
      lastModified: p.createdAt ? new Date(p.createdAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  );

  return [...staticEntries(now), ...taxonomyEntries(now), ...promptEntries];
}
