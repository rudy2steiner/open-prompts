import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { PromptDetailPanel } from '~/components/prompt-gallery/PromptDetailPanel';
import { promptGalleryItemToDetailItem } from '~/lib/prompts/prompt-detail-item';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { galleryHref } from '~/lib/prompts/gallery-path';

type Props = {
  locale: string;
  prompt: PromptGalleryItem;
};

export default async function PageComponent({ locale, prompt }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.promptPage' });
  const item = promptGalleryItemToDetailItem(prompt);

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader
        locale={locale}
        activeNav="gallery"
        langPathSuffix={`/prompt/${prompt.id}`}
      />

      <main className="w-full px-4 pb-12 pt-8">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href={galleryHref(locale)}
            className="mb-4 inline-block text-sm text-[var(--text2)] transition hover:text-[var(--amber)]"
          >
            {t('backToGallery')}
          </Link>
          <PromptDetailPanel item={item} locale={locale} variant="page" />
        </div>
      </main>

      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
