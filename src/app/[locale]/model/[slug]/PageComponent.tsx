import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { PromptGalleryGrid } from '~/components/prompt-gallery/PromptGalleryGrid';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { buildLocaleHref } from '~/lib/op-locale';
import { buildTaxonomyPageJsonLd } from '~/lib/seo/prompt-json-ld';

type Props = {
  locale: string;
  slug: string;
  modelName: string;
  prompts: PromptGalleryItem[];
};

export default async function PageComponent({ locale, slug, modelName, prompts }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.modelPage' });
  const homeHref = buildLocaleHref(locale, '');
  const galleryLink = galleryHref(locale);

  const jsonLd = buildTaxonomyPageJsonLd(
    locale,
    [
      { name: t('breadcrumb.home'), path: '' },
      { name: t('breadcrumb.gallery'), path: '/gallery' },
      { name: modelName, path: `/model/${slug}` },
    ],
    t('heading', { model: modelName }),
    prompts,
  );

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OpenPromptsSiteHeader locale={locale} activeNav="gallery" langPathSuffix="/gallery" />

      <main className="w-full">
        <section className="px-6 pb-8 pt-8">
          <div className="mx-auto w-full max-w-7xl">
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--text3)]">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li>
                  <a href={homeHref} className="hover:text-[var(--text2)]">
                    {t('breadcrumb.home')}
                  </a>
                </li>
                <li aria-hidden="true">›</li>
                <li>
                  <a href={galleryLink} className="hover:text-[var(--text2)]">
                    {t('breadcrumb.gallery')}
                  </a>
                </li>
                <li aria-hidden="true">›</li>
                <li className="text-[var(--text2)]">{modelName}</li>
              </ol>
            </nav>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
              {t('heading', { model: modelName })}
            </h1>
            <p className="mt-1 text-sm text-[var(--text2)]">
              {t('subtitle', { model: modelName, count: prompts.length })}
            </p>

            {prompts.length === 0 ? (
              <p className="mt-8 text-sm text-[var(--text2)]">{t('empty', { model: modelName })}</p>
            ) : (
              <PromptGalleryGrid locale={locale} prompts={prompts} />
            )}
          </div>
        </section>
      </main>

      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
