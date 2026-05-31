'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

const FAQ_KEYS = ['1', '2', '3', '4', '5'] as const;
const STEP_KEYS = ['1', '2', '3', '4'] as const;
const PUBLIC_FEAT_KEYS = ['1', '2', '3', '4'] as const;
const PRIVATE_FEAT_KEYS = ['1', '2', '3', '4'] as const;
const COMPARE_ROW_KEYS = ['1', '2', '3', '4', '5', '6', '7'] as const;

type Props = {
  publicHref: string;
  privateHref: string;
};

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c-2.4 2.7-3.8 5.6-3.8 9s1.4 6.3 3.8 9" />
      <path d="M12 3c2.4 2.7 3.8 5.6 3.8 9s-1.4 6.3-3.8 9" />
      <path d="M3 12h18" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V7a4 4 0 018 0v4" />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 6h8M6 2l4 4-4 4" />
    </svg>
  );
}

export function SubmitLanding({ publicHref, privateHref }: Props) {
  const t = useTranslations('OpenPrompts.submitPage');
  const c = (key: string) => t(`chooser.${key}` as Parameters<typeof t>[0]);
  const g = (key: string) => t(`guide.${key}` as Parameters<typeof t>[0]);

  const stepDesc = (n: (typeof STEP_KEYS)[number]) =>
    n === '4'
      ? `${g('step4DescBefore')}${g('step4Code')}${g('step4DescAfter')}`
      : g(`step${n}Desc`);

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
          text: stepDesc(n),
        })),
      },
    ],
  };

  return (
    <div className="op-sp-landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="op-sp-landing-hero">
        <div className="op-sp-landing-hero-inner">
          <div className="op-sp-landing-eyebrow">{c('eyebrow')}</div>
          <h1 className="op-sp-landing-h1">
            {c('title')}
            <br />
            <em>{c('titleEm')}</em>
          </h1>
          <p className="op-sp-landing-sub">
            <span className="op-sp-landing-sub-line">{c('subtitleLine1')}</span>
            <span className="op-sp-landing-sub-line">{c('subtitleLine2')}</span>
          </p>
        </div>
      </section>

      <section className="op-sp-landing-cards">
        <div className="op-sp-landing-cards-grid">
          <Link href={publicHref} className="op-sp-landing-card">
            <div className="op-sp-landing-card-icon">
              <GlobeIcon />
            </div>
            <div className="op-sp-landing-card-kicker">{c('publicKicker')}</div>
            <div className="op-sp-landing-card-title">{c('publicTitle')}</div>
            <p className="op-sp-landing-card-desc">{c('publicDesc')}</p>
            <ul className="op-sp-landing-feats">
              {PUBLIC_FEAT_KEYS.map((n) => (
                <li key={n}>
                  <span className="op-sp-landing-fd op-sp-landing-fd-y">✓</span>
                  {c(`publicFeat${n}`)}
                </li>
              ))}
              <li>
                <span className="op-sp-landing-fd op-sp-landing-fd-n">–</span>
                {c('publicFeatNo')}
              </li>
            </ul>
            <div className="op-sp-landing-card-cta">
              <span className="op-sp-landing-cta-label">{c('publicCta')}</span>
              <span className="op-sp-landing-cta-arrow">
                <ArrowIcon />
              </span>
            </div>
          </Link>

          <Link href={privateHref} className="op-sp-landing-card">
            <div className="op-sp-landing-card-icon">
              <LockIcon />
            </div>
            <div className="op-sp-landing-card-kicker">{c('privateKicker')}</div>
            <div className="op-sp-landing-card-title">{c('privateTitle')}</div>
            <p className="op-sp-landing-card-desc">{c('privateDesc')}</p>
            <ul className="op-sp-landing-feats">
              {PRIVATE_FEAT_KEYS.map((n) => (
                <li key={n}>
                  <span className="op-sp-landing-fd op-sp-landing-fd-y">✓</span>
                  {c(`privateFeat${n}`)}
                </li>
              ))}
              <li>
                <span className="op-sp-landing-fd op-sp-landing-fd-n">–</span>
                {c('privateFeatNo')}
              </li>
            </ul>
            <div className="op-sp-landing-card-cta">
              <span className="op-sp-landing-cta-label">{c('privateCta')}</span>
              <span className="op-sp-landing-cta-arrow">
                <ArrowIcon />
              </span>
            </div>
          </Link>
        </div>

        <div className="op-sp-landing-divider">
          <div className="op-sp-landing-divider-line" />
          <div className="op-sp-landing-divider-text">{c('compareDivider')}</div>
          <div className="op-sp-landing-divider-line" />
        </div>
      </section>

      <section className="op-sp-landing-compare">
        <table className="op-sp-landing-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>{c('compareFeature')}</th>
              <th className="op-sp-landing-th-pub" style={{ width: '25%' }}>
                {c('comparePublic')}
              </th>
              <th style={{ width: '25%' }}>{c('comparePrivate')}</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROW_KEYS.map((n) => {
              const pub = c(`comparePublic${n}` as Parameters<typeof t>[0]);
              const priv = c(`comparePrivate${n}` as Parameters<typeof t>[0]);
              return (
                <tr key={n}>
                  <td>{c(`compareRow${n}`)}</td>
                  <td>
                    <span className={pub === 'y' ? 'op-sp-landing-ck-y' : 'op-sp-landing-ck-n'}>
                      {pub === 'y' ? '✓' : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={priv === 'y' ? 'op-sp-landing-ck-p' : 'op-sp-landing-ck-n'}>
                      {priv === 'y' ? '✓' : '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="op-sp-landing-how">
        <div className="op-sp-landing-split">
          <div className="op-sp-landing-sticky">
            <p className="op-sp-landing-kicker">{g('guideKicker')}</p>
            <h2 className="op-sp-landing-side-h2">
              {g('howTitleLine1')}
              <br />
              {g('howTitleLine2')}
            </h2>
            <p className="op-sp-landing-side-p">{g('intro')}</p>
          </div>
          <div className="op-sp-landing-steps">
            {STEP_KEYS.map((n) => (
              <div key={n} className="op-sp-landing-step">
                <div className="op-sp-landing-step-num">{n}</div>
                <div>
                  <div className="op-sp-landing-step-title">{g(`step${n}Title`)}</div>
                  <div className="op-sp-landing-step-desc">
                    {n === '4' ? (
                      <>
                        {g('step4DescBefore')}
                        <code>{g('step4Code')}</code>
                        {g('step4DescAfter')}
                      </>
                    ) : (
                      g(`step${n}Desc`)
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="op-sp-landing-faq">
        <div className="op-sp-landing-split">
          <div className="op-sp-landing-sticky">
            <p className="op-sp-landing-kicker">{g('faqKicker')}</p>
            <h2 className="op-sp-landing-side-h2">
              {g('faqTitleLine1')}
              <br />
              {g('faqTitleLine2')}
            </h2>
          </div>
          <div className="op-sp-landing-faq-list">
            {FAQ_KEYS.map((n) => (
              <div key={n} className="op-sp-landing-faq-item">
                <div className="op-sp-landing-faq-q">{g(`faq${n}q`)}</div>
                <div className="op-sp-landing-faq-a">{g(`faq${n}a`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
