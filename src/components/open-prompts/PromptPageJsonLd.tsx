import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { buildPromptPageJsonLd } from '~/lib/seo/prompt-json-ld';

type Props = {
  locale: string;
  prompt: PromptGalleryItem;
};

export async function PromptPageJsonLd({ locale, prompt }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.galleryPage' });
  const galleryLabel = t('title');
  const jsonLd = buildPromptPageJsonLd(prompt, locale, galleryLabel);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
