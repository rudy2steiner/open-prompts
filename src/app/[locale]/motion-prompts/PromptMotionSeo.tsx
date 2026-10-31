import '~/app/[locale]/landing-page.css';
import { getTranslations } from 'next-intl/server';
import { buildFaqJsonLd, type SeoFaq } from '~/lib/seo/json-ld';
import { absoluteUrl } from '~/lib/seo/metadata';

type UseCase = { t: string; d: string };

type Props = {
  locale: string;
};

export async function PromptMotionSeo({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.promptMotionPage' });
  const useCases = t.raw('useCases.items') as UseCase[];
  const faqs = t.raw('faq.items') as SeoFaq[];
  const pageUrl = absoluteUrl(locale, '/motion-prompts');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: t('seo.title'),
        description: t('seo.description'),
        url: pageUrl,
      },
      buildFaqJsonLd(faqs),
    ],
  };

  return (
    <div className="op-landing-seo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="op-landing-seo-inner">
        <section className="op-landing-seo-block" aria-labelledby="motion-seo-usecases">
          <div className="op-landing-section-head">
            <div className="op-landing-eyebrow">{t('useCases.eyebrow')}</div>
            <h2 id="motion-seo-usecases" className="op-landing-section-title">
              {t('useCases.title')}{' '}
              <em>{t('useCases.titleEm')}</em>
            </h2>
            <p className="op-landing-section-sub">{t('useCases.subtitle')}</p>
          </div>
          <div className="op-landing-features-grid">
            {useCases.map((item) => (
              <article key={item.t} className="op-landing-feature-card">
                <h3 className="op-landing-feature-title">{item.t}</h3>
                <p className="op-landing-feature-desc">{item.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="op-landing-seo-block" aria-labelledby="motion-seo-faq">
          <div className="op-landing-section-head">
            <div className="op-landing-eyebrow">{t('faq.eyebrow')}</div>
            <h2 id="motion-seo-faq" className="op-landing-section-title">
              {t('faq.title')}
              <br />
              <em>{t('faq.titleEm')}</em>
            </h2>
          </div>
          <div className="op-landing-faq-list">
            {faqs.map((item) => (
              <article
                key={item.q}
                className="op-landing-faq-item"
              >
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
