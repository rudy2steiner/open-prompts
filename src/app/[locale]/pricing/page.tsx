import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { PricingPlans } from '~/components/billing/PricingPlans';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  return buildPageMetadata({ locale, path: '/pricing', title: 'Pricing', description: 'Buy Open Prompts credits or a monthly subscription.' });
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  return (
    <div className="min-h-screen w-full bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="pricing" langPathSuffix="/pricing" />
      <PricingPlans locale={locale} />
      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
