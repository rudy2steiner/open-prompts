import type { MetadataRoute } from 'next';
import { getSiteUrl } from '~/lib/seo/metadata';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account/'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
