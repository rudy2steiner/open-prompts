import { GEO_PATH, geoCopy, geoPageUrl, siteOrigin } from '~/lib/geo/facts';
import { geoMarkdownLink } from '~/lib/geo/llms';

export function geoJsonLd(locale: string) {
  const copy = geoCopy(locale);
  const pageUrl = geoPageUrl(locale);
  const origin = siteOrigin();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: copy.name,
        description: copy.definition,
        url: pageUrl,
        inLanguage: locale === 'zh' ? 'zh' : 'en',
        image: {
          '@type': 'ImageObject',
          url: `${origin}/og-home.jpg`,
          width: 1200,
          height: 630,
        },
        isPartOf: { '@type': 'WebSite', name: 'Open Prompts', url: origin },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Open Prompts',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        url: pageUrl,
        description: copy.definition,
      },
      {
        '@type': 'FAQPage',
        mainEntity: copy.faqs.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}

export function geoPath(): string {
  return GEO_PATH;
}

export function geoBriefUrl(): string {
  return geoMarkdownLink();
}
