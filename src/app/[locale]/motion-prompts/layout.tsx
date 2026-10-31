import '~/components/prompt-gallery/independent-columns.css';
import type { ReactNode } from 'react';
import '~/app/[locale]/landing-page.css';
import './motion-prompts.css';
import { landingFontClassName } from '~/app/[locale]/landing-fonts';
import { MotionSiteHeader } from './MotionSiteHeader';

export default async function MotionLayout({ children, params }: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <div className={`${landingFontClassName} motion-page`}>
    <MotionSiteHeader locale={locale} />
    {children}
  </div>;
}
