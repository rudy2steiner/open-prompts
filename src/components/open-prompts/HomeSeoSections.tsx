import '~/app/[locale]/landing-page.css';
import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { promptHref } from '~/lib/prompts/seo-paths';
import { formatGalleryStatCount } from '~/lib/prompts/gallery-stats';

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
};

type SeoFeature = { t: string; d: string };
type SeoStep = { t: string; d: string };
type TestimonialCard = { q: string; a: string; handle: string; role: string; avatar: string };
type SeoFaq = { q: string; a: string };

const FEATURE_ICONS = ['🔍', '⚡', '📋', '🗂️', '🔄', '🌐'] as const;

function submitHref(locale: string) {
  return locale === 'en' ? '/submit' : `/${locale}/submit`;
}

/** Prefer travel/vintage poster prompts to match the browser mockup copy. */
function pickBrowserMockupPrompt(prompts: PromptGalleryItem[]): PromptGalleryItem | undefined {
  const withImages = prompts.filter((p) => p.images[0]);
  if (withImages.length === 0) return undefined;

  return (
    withImages.find(
      (p) =>
        /travel|vintage|santorini|poster/i.test(p.title) ||
        /travel|santorini|poster/i.test(p.prompt),
    ) ?? withImages[0]
  );
}

function TestimonialAvatar({ src, alt }: { src: string; alt: string }) {
  if (src.startsWith('/')) {
    return (
      <span className="op-testimonial-avatar op-testimonial-avatar-img" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={32} height={32} decoding="async" />
      </span>
    );
  }
  return (
    <span className="op-testimonial-avatar" aria-hidden>
      {src}
    </span>
  );
}

export async function HomeSeoSections({ locale, prompts }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts' });
  const promptCount = formatGalleryStatCount(prompts.length, locale);

  const features = t.raw('homePage.seoContent.features.items') as SeoFeature[];
  const howSteps = t.raw('homePage.seoContent.howItWorks.steps') as SeoStep[];
  const testimonialCards = t.raw('homePage.seoContent.testimonials.items') as TestimonialCard[];
  const faqs = t.raw('homePage.seoContent.faq.items') as SeoFaq[];
  const browserDemoPrompt = pickBrowserMockupPrompt(prompts);
  const browserDemoImage = browserDemoPrompt?.images[0];
  const browserDemoHref = browserDemoPrompt ? promptHref(locale, browserDemoPrompt.id) : undefined;
  const browserDemoUrl = browserDemoPrompt
    ? `open-prompts.com/prompt/${browserDemoPrompt.id}`
    : t('homePage.seoContent.howItWorks.browserMockup.url');
  const browserResultTitle = browserDemoPrompt?.title
    ?? t('homePage.seoContent.howItWorks.browserMockup.resultTitle');

  const featured = t.raw('homePage.seoContent.testimonials.featured') as {
    q: string;
    handle: string;
    role: string;
    tag: string;
  };

  return (
    <div className="op-landing-seo">
      <div className="op-landing-seo-inner">
        <section className="op-landing-seo-block" aria-labelledby="home-seo-features">
          <div className="op-landing-section-head">
            <div className="op-landing-eyebrow">{t('homePage.seoContent.features.eyebrow')}</div>
            <h2 id="home-seo-features" className="op-landing-section-title">
              {t('homePage.seoContent.features.title')}
              <br />
              <em>{t('homePage.seoContent.features.titleEm')}</em>
            </h2>
            <p className="op-landing-section-sub">{t('homePage.seoContent.features.subtitle')}</p>
          </div>
          <div className="op-landing-features-grid">
            {features.map((f, i) => (
              <article key={f.t} className="op-landing-feature-card">
                <div className="op-landing-feature-num" aria-hidden>
                  {FEATURE_ICONS[i] ?? '✦'}
                </div>
                <h3 className="op-landing-feature-title">{f.t}</h3>
                <p className="op-landing-feature-desc">{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="op-landing-seo-block" aria-labelledby="home-seo-how">
          <div className="op-landing-section-head">
            <div className="op-landing-eyebrow">{t('homePage.seoContent.howItWorks.eyebrow')}</div>
            <h2 id="home-seo-how" className="op-landing-section-title">
              {t('homePage.seoContent.howItWorks.title')}
              <br />
              <em>{t('homePage.seoContent.howItWorks.titleEm')}</em>
            </h2>
            <p className="op-landing-section-sub">{t('homePage.seoContent.howItWorks.subtitle')}</p>
          </div>
          <div className="op-landing-how-grid">
            <ol className="op-landing-how-steps">
              {howSteps.map((step, i) => (
                <li key={step.t} className="op-landing-how-step">
                  <span className="op-landing-how-step-num" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="op-landing-how-step-title">{step.t}</h3>
                    <p className="op-landing-how-step-desc">
                      {step.d.replace('{count}', promptCount)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="op-browser-mockup" aria-hidden>
              <div className="op-browser-chrome">
                <div className="op-browser-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </div>
                {browserDemoHref ? (
                  <a href={browserDemoHref} className="op-browser-url op-browser-url-link">
                    {browserDemoUrl}
                  </a>
                ) : (
                  <span className="op-browser-url">{browserDemoUrl}</span>
                )}
              </div>
              <div className="op-browser-body">
                <div className="op-browser-prompt-label">
                  {t('homePage.seoContent.howItWorks.browserMockup.promptLabel')}
                </div>
                <p className="op-browser-prompt-text">
                  {t('homePage.seoContent.howItWorks.browserMockup.promptText')}
                </p>
                <div className="op-browser-result">
                  {browserDemoImage && browserDemoHref ? (
                    <a href={browserDemoHref} className="op-browser-result-image-link">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={browserDemoImage}
                        alt={browserResultTitle}
                        className="op-browser-result-image"
                        loading="lazy"
                        decoding="async"
                      />
                    </a>
                  ) : browserDemoImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={browserDemoImage}
                      alt={browserResultTitle}
                      className="op-browser-result-image"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="op-browser-result-image op-browser-result-placeholder" aria-hidden />
                  )}
                  <div className="op-browser-result-meta">
                    <div className="op-browser-result-title">{browserResultTitle}</div>
                    <div className="op-browser-result-sub">
                      {t('homePage.seoContent.howItWorks.browserMockup.resultSub')}
                    </div>
                    <span className="op-browser-badge">
                      {t('homePage.seoContent.howItWorks.browserMockup.badge')}
                    </span>
                  </div>
                </div>
                <div className="op-browser-stats">
                  <div>
                    <div className="op-browser-stat-label">
                      {t('homePage.seoContent.howItWorks.browserMockup.statPrompts')}
                    </div>
                    <div className="op-browser-stat-value">{promptCount}+</div>
                  </div>
                  <div>
                    <div className="op-browser-stat-label">
                      {t('homePage.seoContent.howItWorks.browserMockup.statTime')}
                    </div>
                    <div className="op-browser-stat-value">4s</div>
                  </div>
                  <div>
                    <div className="op-browser-stat-label">
                      {t('homePage.seoContent.howItWorks.browserMockup.statCopies')}
                    </div>
                    <div className="op-browser-stat-value">6.2K+</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="op-landing-seo-block" aria-labelledby="home-seo-testimonials">
          <div className="op-landing-section-head">
            <div className="op-landing-eyebrow">{t('homePage.seoContent.testimonials.eyebrow')}</div>
            <h2 id="home-seo-testimonials" className="op-landing-section-title">
              {t('homePage.seoContent.testimonials.title')}
              <br />
              <em>{t('homePage.seoContent.testimonials.titleEm')}</em>
            </h2>
            <p className="op-landing-section-sub">{t('homePage.seoContent.testimonials.subtitle')}</p>
          </div>
          <figure className="op-testimonial-featured">
            <blockquote>&ldquo;{featured.q}&rdquo;</blockquote>
            <figcaption>
              <span className="op-testimonial-handle">{featured.handle}</span>
              <span className="op-testimonial-role">{featured.role}</span>
              <span className="op-testimonial-tag">{featured.tag}</span>
            </figcaption>
          </figure>
          <div className="op-testimonials-grid">
            {testimonialCards.map((item) => (
              <figure key={item.handle} className="op-testimonial-card">
                <div className="op-testimonial-stars" aria-hidden>
                  ★★★★★
                </div>
                <blockquote>&ldquo;{item.q}&rdquo;</blockquote>
                <figcaption className="op-testimonial-card-footer">
                  <TestimonialAvatar src={item.avatar} alt={item.handle} />
                  <span className="op-testimonial-card-meta">
                    <span className="op-testimonial-handle">{item.handle}</span>
                    <span className="op-testimonial-role">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="op-landing-seo-block" aria-labelledby="home-seo-faq">
          <div className="op-landing-eyebrow">{t('homePage.seoContent.faq.eyebrow')}</div>
          <h2 id="home-seo-faq" className="op-landing-section-title">
            {t('homePage.seoContent.faq.title')}
            <br />
            <em>{t('homePage.seoContent.faq.titleEm')}</em>
          </h2>
          <div className="op-landing-faq-grid">
            <aside>
              <h3 className="op-faq-sidebar-title">{t('homePage.seoContent.faq.sidebar.title')}</h3>
              <p className="op-faq-sidebar-desc">{t('homePage.seoContent.faq.sidebar.desc')}</p>
              <div className="op-faq-contact-box">
                <p>
                  {t.rich('homePage.seoContent.faq.sidebar.contact', {
                    githubLink: (chunks) => (
                      <a
                        href="https://github.com/rudy2steiner/open-prompts"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {chunks}
                      </a>
                    ),
                    xLink: (chunks) => (
                      <a href="https://x.com/technoobgo" target="_blank" rel="noreferrer">
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              </div>
            </aside>
            <div className="op-landing-faq-list">
              {faqs.map((item, i) => (
                <details
                  key={item.q}
                  className="op-landing-faq-item"
                  {...(i === 0 ? { open: true } : {})}
                >
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="op-landing-cta" aria-labelledby="home-seo-cta">
          <h2 id="home-seo-cta" className="op-landing-cta-title">
              {t('homePage.seoContent.cta.title')}
              <br />
              <em>{t('homePage.seoContent.cta.titleEm')}</em>
            </h2>
            <p className="op-landing-cta-sub">{t('homePage.seoContent.cta.subtitle')}</p>
            <div className="op-landing-cta-actions">
              <a href={galleryHref(locale)} className="op-landing-btn-primary">
                {t('homePage.seoContent.cta.browse')}
              </a>
              <a href={submitHref(locale)} className="op-landing-btn-ghost">
                {t('homePage.seoContent.cta.submit')}
              </a>
            </div>
          <p className="op-landing-cta-note">
            {t('homePage.seoContent.cta.note', { count: promptCount })}
          </p>
        </section>
      </div>
    </div>
  );
}
