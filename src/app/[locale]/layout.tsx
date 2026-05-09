import clsx from 'clsx';
import {Inter} from 'next/font/google';
import {notFound} from 'next/navigation';
import {getMessages, unstable_setRequestLocale} from 'next-intl/server';
import {NextIntlClientProvider} from 'next-intl';
import {ReactNode} from 'react';
import {locales} from '~/config';
import { CommonProvider } from '~/context/common-context';
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({subsets: ['latin']});

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
                                             children,
                                             params: {locale}
                                           }: Props) {

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Enable static rendering
  unstable_setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html className="h-full" lang={locale}>
    <head>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              try {
                var t = localStorage.getItem('op_theme') || 'light';
                t = (t === 'dark') ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', t);
              } catch (e) {}
            })();
          `,
        }}
      />
      <style
        // Ensure theme variables exist before hydration (avoid white flash).
        dangerouslySetInnerHTML={{
          __html: `
            :root{
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
      className={clsx(inter.className, 'flex h-full flex-col bg-[var(--bg)] text-[var(--text)]')}
    >
    <NextIntlClientProvider messages={messages}>
      <CommonProvider>
        {children}
      </CommonProvider>
    </NextIntlClientProvider>
    <Analytics />
    </body>
    </html>
  );
}
