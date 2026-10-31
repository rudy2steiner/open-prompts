import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { filterPromptsByCategory } from '~/lib/prompts/filter-prompts';
import { galleryHref } from '~/lib/prompts/gallery-path';
import {
  SUBMIT_CATEGORY_EMOJI,
  SUBMIT_CATEGORY_KEYS,
  type SubmitCategoryKey,
} from '~/lib/prompts/prompt-categories';
import { buildLocaleHref } from '~/lib/op-locale';
import {
  categoryKeyToSeoSlug,
  categoryLandingHref,
} from '~/lib/prompts/seo-paths';

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
  categoryCount: number;
};

type CategoryCard = {
  key: SubmitCategoryKey;
  slug: string;
  name: string;
  count: number;
  cover?: string;
};

export default async function PageComponent({ locale, prompts, categoryCount }: Props) {
  const [t, tCategory] = await Promise.all([
    getTranslations({ locale, namespace: 'OpenPrompts.categoriesIndex' }),
    getTranslations({ locale, namespace: 'OpenPrompts.submitPage' }),
  ]);

  const homeHref = buildLocaleHref(locale, '');
  const galleryLink = galleryHref(locale);

  const cards: CategoryCard[] = SUBMIT_CATEGORY_KEYS.map((key) => {
    const filtered = filterPromptsByCategory(prompts, key);
    return {
      key,
      slug: categoryKeyToSeoSlug(key),
      name: tCategory(`categories.${key}`),
      count: filtered.length,
      cover: filtered[0]?.images[0],
    };
  });

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="categories" langPathSuffix="/category" />

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
                <li className="text-[var(--text2)]">{t('heading')}</li>
              </ol>
            </nav>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
              {t('heading')}
            </h1>
            <p className="mt-1 text-sm text-[var(--text2)]">
              {t('subtitle', { count: prompts.length, categoryCount })}
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <li key={card.key}>
                  <a
                    href={categoryLandingHref(locale, card.slug)}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border2)] hover:shadow-md"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface2)]">
                      {card.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.cover}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl opacity-60">
                          {SUBMIT_CATEGORY_EMOJI[card.key]}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <div className="flex items-center gap-2">
                        <span aria-hidden className="text-base">
                          {SUBMIT_CATEGORY_EMOJI[card.key]}
                        </span>
                        <h2 className="text-base font-medium text-[var(--text)] group-hover:text-[var(--amber)]">
                          {card.name}
                        </h2>
                      </div>
                      <p className="text-sm text-[var(--text2)]">
                        {t('cardCount', { count: card.count })}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
