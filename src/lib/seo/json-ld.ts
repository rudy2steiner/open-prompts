import type { PromptGalleryItem } from '~/data/promptGallery';

export type SeoFaq = { q: string; a: string };

export function buildFaqJsonLd(faqs: SeoFaq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function buildHomeJsonLd(
  prompts: PromptGalleryItem[],
  siteUrl: string,
  faqs: SeoFaq[],
) {
  const base = siteUrl.replace(/\/$/, '');
  const galleryUrl = `${base}/gallery`;
  const items = prompts.slice(0, 20).map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'ImageObject',
      name: p.title,
      ...(p.description ? { description: p.description } : {}),
      url: galleryUrl,
      ...(p.images[0] ? { contentUrl: p.images[0] } : {}),
    },
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Open Prompts',
        url: `${base}/`,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${galleryUrl}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        name: 'Featured AI image prompts',
        numberOfItems: items.length,
        itemListElement: items,
      },
      buildFaqJsonLd(faqs),
    ],
  };
}
