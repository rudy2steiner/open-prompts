import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

const FAQ_KEYS = ['1', '2', '3', '4', '5'] as const;
const STEP_KEYS = ['1', '2', '3'] as const;
const TIP_KEYS = ['1', '2', '3', '4'] as const;

function submitHref(locale: string) {
  return locale === 'en' ? '/submit' : `/${locale}/submit`;
}

function galleryHref(locale: string) {
  return locale === 'en' ? '/' : `/${locale}`;
}

type Props = { locale: string };

export async function SubmitSeoGuide({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.submitPage' });
  const g = (key: string) => t(`guide.${key}` as Parameters<typeof t>[0]);

  const faqEntities = FAQ_KEYS.map((n) => ({
    question: g(`faq${n}q`),
    answer: g(`faq${n}a`),
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: faqEntities.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
      {
        '@type': 'HowTo',
        name: g('howTitle'),
        description: g('intro'),
        step: STEP_KEYS.map((n, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: g(`step${n}Title`),
          text: g(`step${n}Desc`),
        })),
      },
    ],
  };

  return (
    <section className="op-sp-guide" aria-labelledby="op-sp-guide-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto w-full max-w-3xl px-6 pb-12 pt-2">
        <header className="op-sp-guide-header">
          <h2 id="op-sp-guide-heading" className="op-sp-guide-title">
            {g('title')}
          </h2>
          <p className="op-sp-guide-lead">{g('intro')}</p>
        </header>

        <article className="op-sp-guide-block">
          <h3 className="op-sp-guide-h3">{g('howTitle')}</h3>
          <ol className="op-sp-guide-steps">
            {STEP_KEYS.map((n) => (
              <li key={n}>
                <strong>{g(`step${n}Title`)}</strong>
                <span>{g(`step${n}Desc`)}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="op-sp-guide-block">
          <h3 className="op-sp-guide-h3">{g('fieldsTitle')}</h3>
          <ul className="op-sp-guide-list">
            {TIP_KEYS.map((n) => (
              <li key={n}>{g(`field${n}`)}</li>
            ))}
          </ul>
        </article>

        <article className="op-sp-guide-block">
          <h3 className="op-sp-guide-h3">{g('visibilityTitle')}</h3>
          <p className="op-sp-guide-p">{g('visibilityPublic')}</p>
          <p className="op-sp-guide-p">{g('visibilityPrivate')}</p>
        </article>

        <article className="op-sp-guide-block">
          <h3 className="op-sp-guide-h3">{g('tipsTitle')}</h3>
          <ul className="op-sp-guide-list">
            {TIP_KEYS.map((n) => (
              <li key={`tip-${n}`}>{g(`tip${n}`)}</li>
            ))}
          </ul>
        </article>

        <article className="op-sp-guide-block">
          <h3 className="op-sp-guide-h3">{g('faqTitle')}</h3>
          <dl className="op-sp-guide-faq">
            {FAQ_KEYS.map((n) => (
              <div key={n} className="op-sp-guide-faq-item">
                <dt>{g(`faq${n}q`)}</dt>
                <dd>{g(`faq${n}a`)}</dd>
              </div>
            ))}
          </dl>
        </article>

        <p className="op-sp-guide-cta">
          <Link href={submitHref(locale)} className="op-sp-guide-link">
            {g('ctaSubmit')}
          </Link>
          {' · '}
          <Link href={galleryHref(locale)} className="op-sp-guide-link">
            {g('ctaGallery')}
          </Link>
        </p>
      </div>
    </section>
  );
}
