import clsx from 'clsx';
import type { Metadata } from 'next';
import {notFound} from 'next/navigation';
import {getMessages, unstable_setRequestLocale} from 'next-intl/server';
import { getSiteUrl } from '~/lib/seo/metadata';
import {cookies} from 'next/headers';
import {NextIntlClientProvider} from 'next-intl';
import {ReactNode} from 'react';
import {locales} from '~/config';
import { CommonProvider } from '~/context/common-context';
import { AuthSessionProvider } from '~/components/auth/AuthSessionProvider';

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
      images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Open Prompts' }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og-default.png'],
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
  unstable_setRequestLocale(locale);

  const messages = await getMessages();
  const themeCookie = (await cookies()).get('op_theme')?.value;
  const initialDataTheme =
    themeCookie === 'light' || themeCookie === 'dark' ? themeCookie : undefined;

  return (
    <html
      className="h-full"
      lang={locale}
      suppressHydrationWarning
      {...(initialDataTheme ? {'data-theme': initialDataTheme} : {})}
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
                  if (l === 'en' || l === 'zh' || l === 'ja') {
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
          `,
        }}
      />
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-EGYP4W50N7" ></script>
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
    <script defer data-domain="open-prompts.com" src="https://app.pageview.app/js/script.js"></script>
    </head>
    <body
      suppressHydrationWarning={true}
      className={clsx('font-sans flex h-full flex-col bg-[var(--bg)] text-[var(--text)]')}
    >
    <NextIntlClientProvider messages={messages}>
      <AuthSessionProvider>
        <CommonProvider>{children}</CommonProvider>
      </AuthSessionProvider>
    </NextIntlClientProvider>
    </body>
    </html>
  );
}
