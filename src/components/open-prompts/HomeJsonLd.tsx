import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { buildHomeJsonLd } from '~/lib/seo/json-ld';
import { getSiteUrl } from '~/lib/seo/metadata';

type SeoFaq = { q: string; a: string };

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
};

export async function HomeJsonLd({ locale, prompts }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts' });
  const faqs = t.raw('homePage.seoContent.faq.items') as SeoFaq[];
  const jsonLd = buildHomeJsonLd(prompts, getSiteUrl(), faqs);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
