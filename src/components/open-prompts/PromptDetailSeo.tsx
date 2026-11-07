import type { PromptGalleryItem } from '~/data/promptGallery';
import { galleryCoverUrl } from '~/lib/prompts/gallery-cover-url';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { resolvePromptCategory } from '~/lib/prompts/prompt-categories';
import {
  categoryKeyToSeoSlug,
  categoryLandingHref,
  modelLabelToSeoSlug,
  modelLandingHref,
  promptHref,
} from '~/lib/prompts/seo-paths';
import { getPromptDetailCopy } from '~/lib/seo/prompt-detail-copy';
import { pickRelatedPrompts } from '~/lib/seo/related-prompts';

type Props = {
  locale: string;
  prompt: PromptGalleryItem;
};

export async function PromptDetailSeo({ locale, prompt }: Props) {
  const copy = await getPromptDetailCopy(locale, prompt);
  const gallery = await getPromptGallery();
  const related = pickRelatedPrompts(prompt, gallery);
  const categoryKey = resolvePromptCategory(prompt.category, prompt.tags);
  const modelSlug = modelLabelToSeoSlug(prompt.model);
  const links = [
    categoryKey
      ? { href: categoryLandingHref(locale, categoryKeyToSeoSlug(categoryKey)), label: copy.categoryLink }
      : null,
    prompt.model
      ? {
          href: modelSlug ? modelLandingHref(locale, modelSlug) : galleryHref(locale, { model: prompt.model }),
          label: copy.modelLink,
        }
      : null,
    ...(categoryKey
      ? prompt.tags.slice(0, 6).map((tag) => ({
          href: galleryHref(locale, { category: categoryKey, tag }),
          label: tag,
        }))
      : []),
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  return (
    <div className="mt-12 space-y-10 border-t border-[var(--border)] pt-8">
      <section aria-labelledby="prompt-seo-howto">
        <h2 id="prompt-seo-howto" className="text-lg font-semibold text-[var(--text)]">{copy.howtoTitle}</h2>
        {copy.steps.map((step) => (
          <p key={step.t} className="mt-4 text-sm leading-7 text-[var(--text2)]">{step.d}</p>
        ))}
      </section>

      <section aria-labelledby="prompt-seo-faq">
        <h2 id="prompt-seo-faq" className="text-lg font-semibold text-[var(--text)]">{copy.faqTitle}</h2>
        <div className="mt-4 space-y-5">
          {copy.faqs.map((item) => (
            <div key={item.q}>
              <h3 className="text-sm font-semibold text-[var(--text)]">{item.q}</h3>
              <p className="mt-1 text-sm leading-7 text-[var(--text2)]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="prompt-seo-related">
          <h2 id="prompt-seo-related" className="text-lg font-semibold text-[var(--text)]">{copy.relatedTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="self-center text-xs text-[var(--text3)]">{copy.alsoLabel}</span>
            {links.map((link) => (
              <a
                key={`${link.href}:${link.label}`}
                href={link.href}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text2)] hover:border-[var(--border2)] hover:text-[var(--text)]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => {
              const cover = galleryCoverUrl(item.images[0]);
              return (
                <li key={item.id}>
                  <a href={promptHref(locale, item.id)} className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
                    ) : (
                      <div className="aspect-[4/3] bg-[var(--surface2)]" />
                    )}
                    <span className="block p-2 text-sm leading-5 text-[var(--text)]">{item.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
