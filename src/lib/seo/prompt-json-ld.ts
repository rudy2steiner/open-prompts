import type { PromptGalleryItem } from '~/data/promptGallery';
import { absoluteUrl } from '~/lib/seo/metadata';

type BreadcrumbItem = { name: string; path: string };

export function buildBreadcrumbJsonLd(locale: string, items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(locale, item.path),
    })),
  };
}

export function buildPromptImageJsonLd(prompt: PromptGalleryItem, locale: string) {
  const image = prompt.images[0];
  if (!image) return null;
  return {
    '@type': 'ImageObject',
    name: prompt.title,
    ...(prompt.description ? { description: prompt.description } : {}),
    contentUrl: image,
    url: absoluteUrl(locale, `/prompt/${prompt.id}`),
  };
}

type JsonLdNode = Record<string, unknown>;

export function buildPromptPageJsonLd(prompt: PromptGalleryItem, locale: string, galleryLabel: string) {
  const graph: JsonLdNode[] = [
    buildBreadcrumbJsonLd(locale, [
      { name: 'Home', path: '' },
      { name: galleryLabel, path: '/gallery' },
      { name: prompt.title, path: `/prompt/${prompt.id}` },
    ]),
  ];
  const imageLd = buildPromptImageJsonLd(prompt, locale);
  if (imageLd) graph.unshift(imageLd);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

export function buildTaxonomyPageJsonLd(
  locale: string,
  items: BreadcrumbItem[],
  listName: string,
  prompts: PromptGalleryItem[],
) {
  const listItems = prompts.slice(0, 50).map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: absoluteUrl(locale, `/prompt/${p.id}`),
    name: p.title,
  }));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildBreadcrumbJsonLd(locale, items),
      {
        '@type': 'ItemList',
        name: listName,
        numberOfItems: listItems.length,
        itemListElement: listItems,
      },
    ],
  };
}
