import type { PromptGalleryItem } from '~/data/promptGallery';
import { promptBreadcrumbLabel, promptPath } from '~/lib/prompts/seo-paths';
import { buildFaqJsonLd, type SeoFaq } from '~/lib/seo/json-ld';
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
    url: absoluteUrl(locale, promptPath(prompt.id)),
  };
}

type JsonLdNode = Record<string, unknown>;

export function buildPromptPageJsonLd(prompt: PromptGalleryItem, locale: string, faqs: SeoFaq[] = [], homeName = 'Home') {
  const pageUrl = absoluteUrl(locale, promptPath(prompt.id));
  const graph: JsonLdNode[] = [
    {
      '@type': 'CreativeWork',
      name: prompt.title,
      url: pageUrl,
      ...(prompt.description?.trim() ? { description: prompt.description.trim() } : {}),
      ...(prompt.model ? { keywords: [prompt.model, ...prompt.tags].filter(Boolean).join(', ') } : {}),
    },
    buildBreadcrumbJsonLd(locale, [
      { name: homeName, path: '' },
      { name: 'image-prompts', path: '/image-prompts' },
      { name: promptBreadcrumbLabel(prompt.id), path: promptPath(prompt.id) },
    ]),
  ];
  const imageLd = buildPromptImageJsonLd(prompt, locale);
  if (imageLd) graph.unshift(imageLd);
  if (faqs.length) graph.push(buildFaqJsonLd(faqs));

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
    url: absoluteUrl(locale, promptPath(p.id)),
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
