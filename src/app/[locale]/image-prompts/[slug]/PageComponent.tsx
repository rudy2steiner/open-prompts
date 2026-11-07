import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { PromptDetailPanel } from '~/components/prompt-gallery/PromptDetailPanel';
import { PromptDetailSeo } from '~/components/open-prompts/PromptDetailSeo';
import { promptGalleryItemToDetailItem } from '~/lib/prompts/prompt-detail-item';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { buildLocaleHref } from '~/lib/op-locale';
import {
  categoryLandingHref,
  categoryKeyToSeoSlug,
  promptBreadcrumbLabel,
  promptPath,
} from '~/lib/prompts/seo-paths';
import { normalizeSubmitCategoryKey } from '~/lib/prompts/prompt-categories';

type Props = {
  locale: string;
  prompt: PromptGalleryItem;
};

export default async function PageComponent({ locale, prompt }: Props) {
  const item = promptGalleryItemToDetailItem(prompt);
  const tPage = await getTranslations({ locale, namespace: 'OpenPrompts.promptPage' });
  const homeHref = buildLocaleHref(locale, '');
  const galleryLink = galleryHref(locale);
  const categoryKey = normalizeSubmitCategoryKey(prompt.category ?? '');
  const category = categoryKey
    ? {
        href: categoryLandingHref(locale, categoryKeyToSeoSlug(categoryKey)),
        label: (await getTranslations({ locale, namespace: 'OpenPrompts.submitPage' }))(`categories.${categoryKey}`),
      }
    : null;

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader
        locale={locale}
        activeNav="gallery"
        langPathSuffix={promptPath(prompt.id)}
      />

      <main className="w-full px-4 pb-12 pt-8">
        <div className="mx-auto w-full max-w-6xl">
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-[var(--text3)]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href={homeHref} className="hover:text-[var(--text2)]">
                  {tPage('breadcrumbHome')}
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href={galleryLink} className="hover:text-[var(--text2)]">
                  image-prompts
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li className="line-clamp-1 text-[var(--text2)]">{promptBreadcrumbLabel(prompt.id)}</li>
            </ol>
          </nav>

          <PromptDetailPanel item={item} locale={locale} variant="page" category={category} />
          <PromptDetailSeo locale={locale} prompt={prompt} />
        </div>
      </main>

      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
