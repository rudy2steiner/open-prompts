import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { PromptDetailPanel } from '~/components/prompt-gallery/PromptDetailPanel';
import { promptGalleryItemToDetailItem } from '~/lib/prompts/prompt-detail-item';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { buildLocaleHref } from '~/lib/op-locale';
import { galleryHref } from '~/lib/prompts/gallery-path';
import {
  categoryLandingHref,
  categoryKeyToSeoSlug,
  modelLabelToSeoSlug,
  modelLandingHref,
} from '~/lib/prompts/seo-paths';
import { normalizeSubmitCategoryKey } from '~/lib/prompts/prompt-categories';

type Props = {
  locale: string;
  prompt: PromptGalleryItem;
};

export default async function PageComponent({ locale, prompt }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.promptPage' });
  const item = promptGalleryItemToDetailItem(prompt);
  const homeHref = buildLocaleHref(locale, '');
  const galleryLink = galleryHref(locale);
  const modelSlug = modelLabelToSeoSlug(prompt.model);
  const categoryKey = normalizeSubmitCategoryKey(prompt.category ?? '');
  let categoryLabel = '';
  if (categoryKey) {
    const tCat = await getTranslations({ locale, namespace: 'OpenPrompts.submitPage' });
    categoryLabel = tCat(`categories.${categoryKey}`);
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader
        locale={locale}
        activeNav="gallery"
        langPathSuffix={`/prompt/${prompt.id}`}
      />

      <main className="w-full px-4 pb-12 pt-8">
        <div className="mx-auto w-full max-w-2xl">
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-[var(--text3)]">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href={homeHref} className="hover:text-[var(--text2)]">
                  {t('breadcrumbHome')}
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href={galleryLink} className="hover:text-[var(--text2)]">
                  {t('breadcrumbGallery')}
                </Link>
              </li>
              {modelSlug ? (
                <>
                  <li aria-hidden="true">›</li>
                  <li>
                    <Link
                      href={modelLandingHref(locale, modelSlug)}
                      className="hover:text-[var(--text2)]"
                    >
                      {prompt.model}
                    </Link>
                  </li>
                </>
              ) : null}
              <li aria-hidden="true">›</li>
              <li className="line-clamp-1 text-[var(--text2)]">{prompt.title}</li>
            </ol>
          </nav>

          <p className="mb-4 text-sm leading-relaxed text-[var(--text2)]">
            {t('seoIntro', { model: prompt.model, title: prompt.title })}
            {categoryKey ? (
              <>
                {' '}
                <Link
                  href={categoryLandingHref(locale, categoryKeyToSeoSlug(categoryKey))}
                  className="text-[var(--amber)] hover:underline"
                >
                  {categoryLabel}
                </Link>
              </>
            ) : null}
          </p>

          <PromptDetailPanel item={item} locale={locale} variant="page" />
        </div>
      </main>

      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
