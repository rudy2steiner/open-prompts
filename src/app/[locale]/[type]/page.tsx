import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '~/app/[locale]/landing-page.css';
import { landingFontClassName } from '~/app/[locale]/landing-fonts';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { CreationShowcaseMedia, type CreationMediaLabels } from '~/components/create/CreationShowcaseMedia';
import { CREATION_SHOWCASE_MEDIA, resolveCreationShowcaseMedia } from '~/lib/generation/creation-showcase-media';
import { CreationTypesSection } from '~/components/open-prompts/CreationTypesSection';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { STARTER_CREDIT_MATRIX, SITE_IMAGE_MODELS } from '~/lib/billing/quotes';
import { PROVIDER_CAPABILITIES } from '~/lib/generation/capabilities';
import {
  CREATION_TYPES,
  type CreationType,
  createWithModeHref,
  creationTypeHref,
  creationTypePath,
  pickCreationTypeLandingExamples,
  resolveCreationType,
} from '~/lib/generation/creation-types';
import { buildLocaleHref } from '~/lib/op-locale';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { promptHref } from '~/lib/prompts/seo-paths';
import { buildFaqJsonLd, type SeoFaq } from '~/lib/seo/json-ld';
import { absoluteUrl, buildPageMetadata, LOCALES, normalizeLocale } from '~/lib/seo/metadata';

export const revalidate = 300;
export const dynamicParams = false;

type Params = { locale: string; type: string };
type CopyItem = { t: string; d: string };

const FEATURE_ICONS = ['✦', '◎', '⚡'] as const;
const CAPS = PROVIDER_CAPABILITIES.internal;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => CREATION_TYPES.map((type) => ({ locale, type: type.slug })));
}

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const { locale = 'en', type: slug } = await props.params;
  const type = resolveCreationType(slug);
  if (!type) return {};
  const normalized = normalizeLocale(locale);
  setRequestLocale(normalized);
  const t = await getTranslations({ locale: normalized, namespace: 'OpenPrompts.creationTypes' });
  return buildPageMetadata({
    locale: normalized,
    path: creationTypePath(type.slug),
    title: t(`types.${type.key}.seo.title`),
    description: t(`types.${type.key}.seo.description`),
    keywords: t(`types.${type.key}.seo.keywords`)
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    image: { url: '/og-home-v2.jpg', width: 1200, height: 630, alt: t(`types.${type.key}.name`) },
  });
}

function CreationDemo({ locale, type, example, labels, mediaLabels }: {
  locale: string;
  type: CreationType;
  example?: PromptGalleryItem;
  labels: { prompt: string; demoPrompt: string; useExample: string };
  mediaLabels: CreationMediaLabels;
}) {
  const verified = example ? CREATION_SHOWCASE_MEDIA[example.id] : undefined;
  return (
    <div className="op-ctype-demo">
      <CreationShowcaseMedia
        media={resolveCreationShowcaseMedia(example?.images ?? [], verified)}
        title={example?.title ?? labels.useExample}
        imageKeyPrefix={example?.id ?? type.slug}
        needsInput={type.mode !== 'text'}
        contentMismatch={verified?.contentMismatch}
        priority
        labels={mediaLabels}
      />
      <details className="op-ctype-prompt">
        <summary>{labels.prompt}</summary>
        <p className="op-ctype-demo-prompt">{example?.prompt ?? labels.demoPrompt}</p>
      </details>
      <div className="op-ctype-media-meta">
        <a href={createWithModeHref(locale, type.mode, example?.id)} className="op-ctype-demo-use">{labels.useExample}</a>
      </div>
    </div>
  );
}

export default async function CreationTypeLandingPage(props: { params: Promise<Params> }) {
  const { locale = 'en', type: slug } = await props.params;
  const type = resolveCreationType(slug);
  if (!type) notFound();
  const normalized = normalizeLocale(locale);
  setRequestLocale(normalized);

  const [t, tc, ui, prompts] = await Promise.all([
    getTranslations({ locale: normalized, namespace: 'OpenPrompts.creationTypes' }),
    getTranslations({ locale: normalized, namespace: 'OpenPrompts.creationTypes.common' }),
    getTranslations({ locale: normalized, namespace: 'OpenPrompts' }),
    getPromptGallery(),
  ]);
  const mediaLabels: CreationMediaLabels = {
    ...tc.raw('media'),
    close: ui('createPage.viewerClose'),
    prev: ui('createPage.viewerPrev'),
    next: ui('createPage.viewerNext'),
    coverLoadFailed: ui('gallery.coverLoadFailed'),
  };
  const k = (path: string) => `types.${type.key}.${path}`;
  const features = t.raw(k('features.items')) as CopyItem[];
  const steps = t.raw(k('steps.items')) as CopyItem[];
  const useCases = t.raw(k('useCases.items')) as CopyItem[];
  const faqs = t.raw(k('faq')) as SeoFaq[];

  const { hero: heroExample, showcase } = pickCreationTypeLandingExamples(prompts, type.mode);
  const createHref = createWithModeHref(normalized, type.mode);
  const pageUrl = absoluteUrl(normalized, creationTypePath(type.slug));
  const name = t(k('name'));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: t(k('seo.title')),
        description: t(k('seo.description')),
        inLanguage: normalized,
        breadcrumb: { '@id': `${pageUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${pageUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: tc('breadcrumbHome'), item: absoluteUrl(normalized, '') },
          { '@type': 'ListItem', position: 2, name, item: pageUrl },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: `Open Prompts ${name}`,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        url: pageUrl,
        description: t(k('seo.description')),
      },
      buildFaqJsonLd(faqs),
    ],
  };

  return (
    <div className={`min-h-screen w-full ${landingFontClassName}`}>
      <OpenPromptsSiteHeader
        locale={normalized}
        activeNav="create"
        langPathSuffix={creationTypePath(type.slug)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <main className="w-full">
        <div className="op-landing-hero-wrap">
          <section className="op-landing-hero op-ctype-hero">
            <div>
              <nav className="op-ctype-breadcrumb" aria-label="Breadcrumb">
                <a href={buildLocaleHref(normalized, '')}>{tc('breadcrumbHome')}</a>
                <span aria-hidden>/</span>
                <span aria-current="page">{name}</span>
              </nav>
              <div className="op-landing-hero-label">{t(k('hero.eyebrow'))}</div>
              <h1 className="op-landing-h1">
                {t(k('hero.title'))}
                <br />
                <em>{t(k('hero.titleEm'))}</em>
              </h1>
              <p className="op-landing-sub">{t(k('hero.subtitle'))}</p>
              <div className="op-landing-actions">
                <a href={createHref} className="op-landing-btn-primary">
                  {t(k('hero.cta'))}
                </a>
                <a href={galleryHref(normalized)} className="op-landing-btn-ghost">
                  {tc('browsePrompts')}
                </a>
              </div>
              <nav className="op-landing-creation-nav" aria-label={t('section.title')}>
                {CREATION_TYPES.map((item) => (
                  <a
                    key={item.slug}
                    href={creationTypeHref(normalized, item.slug)}
                    aria-current={item.slug === type.slug ? 'page' : undefined}
                    className={`op-landing-model-pill${item.slug === type.slug ? ' is-active' : ''}`}
                  >
                    {t(`types.${item.key}.name`)}
                  </a>
                ))}
              </nav>
              <ul className="op-ctype-specs">
                <li>{tc('specs.models', { count: SITE_IMAGE_MODELS.length })}</li>
                <li>{tc('specs.ratios', { count: CAPS.aspectRatios.length })}</li>
                <li>{tc('specs.quality')}</li>
                <li>{tc('specs.count', { count: CAPS.maxCount })}</li>
              </ul>
            </div>
            <CreationDemo
              locale={normalized}
              type={type}
              example={heroExample}
              mediaLabels={mediaLabels}
              labels={{
                prompt: type.mode === 'edit' ? tc('demo.instruction') : tc('demo.prompt'),
                demoPrompt: t(k('demoPrompt')),
                useExample: heroExample ? tc('demo.useExample') : t(k('hero.cta')),
              }}
            />
          </section>
        </div>
      </main>

      <div className="op-landing-seo">
        <div className="op-landing-seo-inner">
          <section className="op-landing-seo-block" aria-labelledby="ctype-features">
            <div className="op-landing-section-head">
              <div className="op-landing-eyebrow">{tc('featuresEyebrow')}</div>
              <h2 id="ctype-features" className="op-landing-section-title">
                {t(k('features.title'))}
                <br />
                <em>{t(k('features.titleEm'))}</em>
              </h2>
              <p className="op-landing-section-sub">{t(k('features.subtitle'))}</p>
            </div>
            <div className="op-landing-features-grid">
              {features.map((item, i) => (
                <article key={item.t} className="op-landing-feature-card">
                  <div className="op-landing-feature-num" aria-hidden>
                    {FEATURE_ICONS[i] ?? '✦'}
                  </div>
                  <h3 className="op-landing-feature-title">{item.t}</h3>
                  <p className="op-landing-feature-desc">{item.d}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="op-landing-seo-block" aria-labelledby="ctype-steps">
            <div className="op-landing-section-head">
              <div className="op-landing-eyebrow">{tc('stepsEyebrow')}</div>
              <h2 id="ctype-steps" className="op-landing-section-title">
                {t(k('steps.title'))}
                <br />
                <em>{t(k('steps.titleEm'))}</em>
              </h2>
            </div>
            <ol className="op-ctype-steps">
              {steps.map((step, i) => (
                <li key={step.t} className="op-ctype-step">
                  <span className="op-landing-how-step-num" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="op-landing-how-step-title">{step.t}</h3>
                  <p className="op-landing-how-step-desc">{step.d}</p>
                </li>
              ))}
            </ol>
            <div className="op-ctype-center">
              <a href={createHref} className="op-landing-btn-primary">
                {t(k('hero.cta'))}
              </a>
            </div>
          </section>

        </div>
      </div>
      <div className="op-ctype-showcase">
          {showcase.length > 0 ? (
            <section className="op-landing-seo-block" aria-labelledby="ctype-examples">
              <div className="op-landing-section-head">
                <div className="op-landing-eyebrow">{tc('examples.eyebrow')}</div>
                <h2 id="ctype-examples" className="op-landing-section-title">
                  {tc('examples.title')}
                  <em>{tc('examples.titleEm')}</em>
                </h2>
                <p className="op-landing-section-sub">{tc('examples.subtitle')}</p>
              </div>
              <div className="op-ctype-cases">
                {showcase.map(({ capability, prompt: item }, i) => {
                  const verified = CREATION_SHOWCASE_MEDIA[item.id];
                  const demo = type.mode === 'reference' ? verified?.siteDemo : undefined;
                  return (
                  <article key={item.id} className={`op-ctype-case${i % 2 ? ' is-reverse' : ''}`}>
                    <div className="op-ctype-case-media">
                      <CreationShowcaseMedia
                        media={resolveCreationShowcaseMedia(demo?.outputs ?? item.images, demo ?? verified)}
                        title={item.title}
                        imageKeyPrefix={item.id}
                        needsInput={type.mode !== 'text'}
                        contentMismatch={CREATION_SHOWCASE_MEDIA[item.id]?.contentMismatch}
                        labels={mediaLabels}
                      />
                    </div>
                    <div className="op-ctype-case-copy">
                      <div className="op-ctype-case-num">
                        {String(i + 1).padStart(2, '0')} · {name}
                      </div>
                      <h3 className="op-ctype-case-title">{t(k(`showcase.${capability}.t`))}</h3>
                      <p className="op-ctype-case-desc">{t(k(`showcase.${capability}.d`))}</p>
                      {CREATION_SHOWCASE_MEDIA[item.id]?.promptDescriptionOnly ? (
                        <p className="op-artwork-notice">{tc('media.promptDescriptionOnly')}</p>
                      ) : null}
                      <details className="op-ctype-prompt op-ctype-case-prompt" open>
                        <summary>{tc(CREATION_SHOWCASE_MEDIA[item.id]?.promptDescriptionOnly ? 'media.sourceDescription' : 'examples.prompt')} · {item.title}</summary>
                        <p>{demo?.prompt ?? item.prompt}</p>
                      </details>
                      <div className="op-ctype-case-actions">
                        <a href={createWithModeHref(normalized, type.mode, item.id, demo ? 'site' : undefined)} className="op-landing-btn-primary">
                          {tc('examples.use')}
                        </a>
                        <a href={promptHref(normalized, item.id)} className="op-landing-btn-ghost">
                          {tc('examples.view')}
                        </a>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            </section>
          ) : null}

      </div>
      <div className="op-landing-seo">
        <div className="op-landing-seo-inner">
          <section className="op-landing-seo-block" aria-labelledby="ctype-use-cases">
            <div className="op-landing-section-head">
              <div className="op-landing-eyebrow">{tc('useCasesEyebrow')}</div>
              <h2 id="ctype-use-cases" className="op-landing-section-title">
                {t(k('useCases.title'))}
                <br />
                <em>{t(k('useCases.titleEm'))}</em>
              </h2>
            </div>
            <div className="op-ctype-usecases">
              {useCases.map((item) => (
                <article key={item.t} className="op-landing-feature-card">
                  <h3 className="op-landing-feature-title">{item.t}</h3>
                  <p className="op-landing-feature-desc">{item.d}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="op-landing-seo-block" aria-labelledby="ctype-models">
            <div className="op-landing-section-head">
              <div className="op-landing-eyebrow">{tc('models.eyebrow')}</div>
              <h2 id="ctype-models" className="op-landing-section-title">
                {tc('models.title')}
                <br />
                <em>{tc('models.titleEm', { name })}</em>
              </h2>
              <p className="op-landing-section-sub">{tc('models.subtitle')}</p>
            </div>
            <div className="op-ctype-table-wrap">
              <table className="op-ctype-table">
                <thead>
                  <tr>
                    <th scope="col">{tc('models.modelCol')}</th>
                    <th scope="col">{tc('models.creditsCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {STARTER_CREDIT_MATRIX.map((row) => (
                    <tr key={row.model}>
                      <th scope="row">{row.model}</th>
                      <td>{tc('models.credits', { count: row[type.creditKey] })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="op-ctype-table-note">
                {tc('models.note')}{' '}
                <a href={buildLocaleHref(normalized, '/pricing')}>{tc('models.pricing')}</a>
              </p>
            </div>
          </section>

          <section className="op-landing-seo-block" aria-labelledby="ctype-faq">
            <div className="op-landing-section-head">
              <div className="op-landing-eyebrow">{tc('faq.eyebrow')}</div>
              <h2 id="ctype-faq" className="op-landing-section-title">
                {tc('faq.title')}
                <br />
                <em>{name}</em>
              </h2>
            </div>
            <div className="op-landing-faq-list op-ctype-faq">
              {faqs.map((item, i) => (
                <details key={item.q} className="op-landing-faq-item" {...(i === 0 ? { open: true } : {})}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <CreationTypesSection locale={normalized} current={type.slug} />

          <section className="op-landing-cta" aria-labelledby="ctype-cta">
            <h2 id="ctype-cta" className="op-landing-cta-title">
              {t(k('cta.title'))}
              <br />
              <em>{t(k('cta.titleEm'))}</em>
            </h2>
            <p className="op-landing-cta-sub">{t(k('cta.subtitle'))}</p>
            <div className="op-landing-cta-actions">
              <a href={createHref} className="op-landing-btn-primary">
                {t(k('hero.cta'))}
              </a>
              <a href={galleryHref(normalized)} className="op-landing-btn-ghost">
                {tc('browsePrompts')}
              </a>
            </div>
            <p className="op-landing-cta-note">{tc('ctaNote')}</p>
          </section>
        </div>
      </div>

      <OpenPromptsSiteFooter locale={normalized} />
    </div>
  );
}
