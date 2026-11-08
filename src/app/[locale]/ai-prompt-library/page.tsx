import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import '~/app/[locale]/landing-page.css';
import { landingFontClassName } from '~/app/[locale]/landing-fonts';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { geoBriefUrl, geoJsonLd, geoPath } from '~/lib/geo/page-copy';
import { geoCopy } from '~/lib/geo/facts';
import { absoluteUrl, buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale = 'en' } = await props.params;
  const normalized = normalizeLocale(locale);
  setRequestLocale(normalized);
  const copy = geoCopy(normalized);
  const metadata = buildPageMetadata({
    locale: normalized,
    path: geoPath(),
    title: normalized === 'zh' ? 'AI 提示词库' : normalized === 'ja' ? 'AI Prompts' : 'AI Prompt Library',
    description: copy.metaDescription,
    image: { url: '/og-home-v2.jpg', width: 1200, height: 630, alt: 'Open Prompts' },
  });
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: { 'text/markdown': geoBriefUrl() },
    },
  };
}

export default async function AiPromptLibraryPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale = 'en' } = await props.params;
  const normalized = normalizeLocale(locale);
  setRequestLocale(normalized);
  const copy = geoCopy(normalized);
  const imageLibrary = absoluteUrl(normalized, '/image-prompts');
  const motionLibrary = absoluteUrl(normalized, '/motion-prompts');

  return (
    <div className={`min-h-screen w-full op-landing-root ${landingFontClassName}`}>
      <OpenPromptsSiteHeader
        locale={normalized}
        activeNav="account"
        langPathSuffix="/ai-prompt-library"
      />
    <article className="op-landing-seo">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(geoJsonLd(normalized)) }}
      />
      <div className="op-geo">
        <h1>{copy.name}</h1>
        <p>{copy.definition}</p>
        <p>
          <a href={imageLibrary}>{normalized === 'zh' ? '图片提示词' : 'Image prompts'}</a>
          {' · '}
          <a href={motionLibrary}>{normalized === 'zh' ? '动效提示词' : 'Motion prompts'}</a>
          {' · '}
          <a href={geoBriefUrl()}>llms-full.txt</a>
        </p>

        <h2>{copy.stepsTitle}</h2>
        <h3>{normalized === 'zh' ? '图片' : 'Image'}</h3>
        <ol>
          {copy.imageSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3>{normalized === 'zh' ? '动效' : 'Motion'}</h3>
        <ol>
          {copy.motionSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2>{copy.compareTitle}</h2>
        <table>
          <thead>
            <tr>
              {copy.compareHeaders.map((header) => (
                <th key={header || 'aspect'}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {copy.compareRows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <h2>{copy.limitsTitle}</h2>
        <ul>
          {copy.limits.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h2>{copy.faqTitle}</h2>
        {copy.faqs.map((item) => (
          <section key={item.q}>
            <h3>{item.q}</h3>
            <p>{item.a}</p>
          </section>
        ))}
      </div>
    </article>
      <OpenPromptsSiteFooter locale={normalized} />
    </div>
  );
}
