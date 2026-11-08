import '~/app/[locale]/landing-page.css';
import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { CREATION_SHOWCASE_MEDIA, resolveCreationShowcaseMedia } from '~/lib/generation/creation-showcase-media';
import {
  CREATION_TYPES,
  type CreationTypeSlug,
  createWithModeHref,
  creationTypeHref,
  pickCreationTypeLandingExamples,
} from '~/lib/generation/creation-types';

type Props = {
  locale: string;
  current?: CreationTypeSlug;
  prompts?: PromptGalleryItem[];
};

export async function CreationTypesSection({ locale, current, prompts }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.creationTypes' });
  const headingId = current ? `creation-types-${current}` : 'creation-types';
  const titleKey = current ? 'section.otherTitle' : 'section.title';
  const titleEmKey = current ? 'section.otherTitleEm' : 'section.titleEm';

  return (
    <section className="op-landing-seo-block" aria-labelledby={headingId}>
      <div className="op-landing-section-head">
        <div className="op-landing-eyebrow">{t('section.eyebrow')}</div>
        <h2 id={headingId} className="op-landing-section-title">
          {t(titleKey)}
          <br />
          <em>{t(titleEmKey)}</em>
        </h2>
        <p className="op-landing-section-sub">{t('section.subtitle')}</p>
      </div>
      <div className="op-ctype-grid">
        {CREATION_TYPES.map((type) => {
          const isCurrent = type.slug === current;
          const hero = prompts ? pickCreationTypeLandingExamples(prompts, type.mode).hero : undefined;
          const preview = hero ? resolveCreationShowcaseMedia(hero.images, CREATION_SHOWCASE_MEDIA[hero.id]).outputs[0] : undefined;
          return (
            <article key={type.slug} className={`op-ctype-card${isCurrent ? ' is-current' : ''}${preview ? ' has-preview' : ''}`}>
              {hero && preview ? (
                <a href={creationTypeHref(locale, type.slug)} className="op-ctype-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={`${t(`types.${type.key}.name`)} · ${hero.title}`} loading="lazy" decoding="async" />
                </a>
              ) : null}
              <div className="op-ctype-card-copy">
                <h3 className="op-ctype-title">
                  {isCurrent ? (
                    t(`types.${type.key}.name`)
                  ) : (
                    <a href={creationTypeHref(locale, type.slug)}>{t(`types.${type.key}.name`)}</a>
                  )}
                </h3>
                <p className="op-ctype-desc">{t(`types.${type.key}.card`)}</p>
                <div className="op-ctype-actions">
                  <a href={createWithModeHref(locale, type.mode)} className="op-ctype-try">
                    {t('section.tryNow')}
                  </a>
                  {isCurrent ? (
                    <span className="op-ctype-current">{t('section.current')}</span>
                  ) : (
                    <a href={creationTypeHref(locale, type.slug)} className="op-ctype-more">
                      {t('section.learnMore')}
                    </a>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
