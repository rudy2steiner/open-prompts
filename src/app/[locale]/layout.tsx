import clsx from 'clsx';
import Script from 'next/script';
import type { Metadata } from 'next';
import {notFound} from 'next/navigation';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
import { getSiteUrl } from '~/lib/seo/metadata';
import {NextIntlClientProvider} from 'next-intl';
import type {CSSProperties, ReactNode} from 'react';
import {locales} from '~/config';
import { CommonProvider } from '~/context/common-context';
import { AuthSessionProvider } from '~/components/auth/AuthSessionProvider';
import { PromoBanner } from '~/components/site/PromoBanner';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`),
    title: {
      default: 'Open Prompts',
      template: '%s | Open Prompts',
    },
    openGraph: {
      siteName: 'Open Prompts',
      type: 'website',
      images: [{ url: '/og-home-v2.jpg', width: 1200, height: 630, alt: 'Open Prompts' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og-home-v2.jpg'],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  };
}

export default async function LocaleLayout({
                                             children,
                                             params,
                                           }: Props) {
  const {locale} = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Enable static rendering
  setRequestLocale(locale);

  const messages = await getMessages();
  const promo = await getTranslations({ locale, namespace: 'OpenPrompts.promo' });
  const promoText = promo('banner').trim();
  const promoHref = promo('href').trim();

  return (
    <html
      className="h-full"
      lang={locale}
      suppressHydrationWarning
    >
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              /* Keep in sync with src/lib/op-theme.ts OP_THEME_BG */
              var DARK_BG = '#0e0d0b';
              var LIGHT_BG = '#ffffff';
              function applyThemeFromStorage() {
                try {
                  var t = localStorage.getItem('op_theme') || 'light';
                  t = (t === 'dark') ? 'dark' : 'light';
                  var bg = (t === 'dark') ? DARK_BG : LIGHT_BG;
                  var d = document.documentElement;
                  d.setAttribute('data-theme', t);
                  d.style.backgroundColor = bg;
                  if (document.body) document.body.style.backgroundColor = bg;
                  try {
                    document.cookie = 'op_theme=' + encodeURIComponent(t) + ';path=/;max-age=31536000;SameSite=Lax';
                  } catch (e3) {}
                } catch (e) {
                  try {
                    var t0 = document.documentElement.getAttribute('data-theme');
                    if (t0 === 'dark' || t0 === 'light') {
                      var bg0 = (t0 === 'dark') ? DARK_BG : LIGHT_BG;
                      document.documentElement.style.backgroundColor = bg0;
                      if (document.body) document.body.style.backgroundColor = bg0;
                    }
                  } catch (e2) {}
                }
              }
              applyThemeFromStorage();
              function syncLocaleCookie() {
                try {
                  var l = localStorage.getItem('op_locale');
                  if (${JSON.stringify(locales)}.includes(l)) {
                    document.cookie = 'NEXT_LOCALE=' + encodeURIComponent(l) + ';path=/;max-age=31536000;SameSite=Lax';
                  }
                } catch (e4) {}
              }
              syncLocaleCookie();
              function paintBody() {
                try {
                  var t = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
                  var bg = (t === 'dark') ? DARK_BG : LIGHT_BG;
                  if (document.body) document.body.style.backgroundColor = bg;
                } catch (e) {}
              }
              if (document.body) paintBody();
              else document.addEventListener('DOMContentLoaded', paintBody);
              document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'visible') applyThemeFromStorage();
              });
              window.addEventListener('pageshow', function (e) {
                if (e.persisted) applyThemeFromStorage();
              });
            })();
          `,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              document.addEventListener('click', function (event) {
                try {
                  if (document.documentElement.dataset.opSiteNavReady === 'true') return;
                  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  var target = event.target;
                  var link = target && target.closest ? target.closest('a[data-op-site-nav="true"]') : null;
                  if (!link || link.target || link.hasAttribute('download')) return;
                  var url = new URL(link.href, window.location.href);
                  if (url.origin !== window.location.origin) return;
                  event.preventDefault();
                  window.__opPendingSiteNav = url.href;
                  link.setAttribute('aria-busy', 'true');
                  var indicator = link.querySelector('[data-nav-pending]');
                  if (indicator) {
                    indicator.setAttribute('data-nav-pending', 'true');
                    indicator.style.opacity = '0.6';
                  }
                } catch (error) {}
              }, true);
            })();
          `,
        }}
      />
      <style
        // Ensure theme variables exist before hydration (avoid white flash).
        dangerouslySetInnerHTML={{
          __html: `
            :root{
              color-scheme: dark;
              --bg:#0e0d0b;
              --surface:#1f1d18;
              --surface2:rgba(255,255,255,0.05);
              --border:rgba(255,255,255,0.14);
              --border2:rgba(255,255,255,0.22);
              --text:#f0ebe0;
              --text2:#a09a8e;
              --text3:#6b6560;
              --amber:#e8a020;
              --amber2:#f0b840;
              --ctl-bg:rgba(255,255,255,0.06);
              --ctl-border:rgba(255,255,255,0.14);
              --ctl-hover:rgba(255,255,255,0.1);
              --panel-bg:rgba(31,29,24,0.98);
            }
            [data-theme='light']{
              color-scheme: light;
              --bg:#ffffff;
              --surface:#ffffff;
              --surface2:rgba(0,0,0,0.05);
              --border:rgba(0,0,0,0.12);
              --border2:rgba(0,0,0,0.18);
              --text:#1a1814;
              --text2:#5a5650;
              --text3:#9a9590;
              --amber:#c87010;
              --amber2:#d98020;
              --ctl-bg:rgba(0,0,0,0.04);
              --ctl-border:rgba(0,0,0,0.12);
              --ctl-hover:rgba(0,0,0,0.07);
              --panel-bg:rgba(255,255,255,0.98);
            }
            html,body{ height:100%; background:var(--bg); color:var(--text); }
            /* Theme toggle glyphs follow <html data-theme> (no React sync — avoids tab/hydration flicker). */
            .op-theme-toggle-moon,.op-theme-toggle-sun{ grid-area:1/1; line-height:1; }
            html:not([data-theme='light']) .op-theme-toggle-sun,
            html[data-theme='dark'] .op-theme-toggle-sun{ display:none !important; }
            html:not([data-theme='light']) .op-theme-toggle-moon,
            html[data-theme='dark'] .op-theme-toggle-moon{ display:inline !important; }
            html[data-theme='light'] .op-theme-toggle-moon{ display:none !important; }
            html[data-theme='light'] .op-theme-toggle-sun{ display:inline !important; }
            .op-credits-badge{display:inline-flex;min-height:34px;align-items:center;gap:5px;border:1px solid var(--border);border-radius:999px;padding:0 10px 0 8px;color:var(--text);background:var(--surface);font-size:12px;font-weight:700;white-space:nowrap}
            .op-credits-badge svg{width:18px;height:18px;flex:0 0 auto;color:#e6b325}
            @media(max-width:720px){.op-credits-badge{padding:0 8px;font-size:11px}}
          `,
        }}
      />
      <Script strategy="lazyOnload" src="https://www.googletagmanager.com/gtag/js?id=G-EGYP4W50N7" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-EGYP4W50N7');
                  `,
        }}
      />
    <Script strategy="lazyOnload" data-domain="open-prompts.com" src="https://app.pageview.app/js/script.js" />
    </head>
    <body
      suppressHydrationWarning={true}
      className={clsx('font-sans flex h-full flex-col bg-[var(--bg)] text-[var(--text)]')}
    >
    <NextIntlClientProvider messages={messages}>
      <AuthSessionProvider>
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{ '--promo-banner-height': promoText ? '36px' : '0px' } as CSSProperties}
        >
          <PromoBanner text={promoText} href={promoHref} />
          <CommonProvider>{children}</CommonProvider>
        </div>
      </AuthSessionProvider>
    </NextIntlClientProvider>
    </body>
    </html>
  );
}
