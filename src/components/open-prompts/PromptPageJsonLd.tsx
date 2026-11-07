import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { getPromptDetailCopy } from '~/lib/seo/prompt-detail-copy';
import { buildPromptPageJsonLd } from '~/lib/seo/prompt-json-ld';

type Props = {
  locale: string;
  prompt: PromptGalleryItem;
};

export async function PromptPageJsonLd({ locale, prompt }: Props) {
  const [copy, t] = await Promise.all([
    getPromptDetailCopy(locale, prompt),
    getTranslations({ locale, namespace: 'OpenPrompts.promptPage' }),
  ]);
  const jsonLd = buildPromptPageJsonLd(prompt, locale, copy.faqs, t('breadcrumbHome'));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
