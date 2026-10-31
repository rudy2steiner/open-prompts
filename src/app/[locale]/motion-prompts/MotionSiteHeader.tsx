'use client';

import { usePathname } from 'next/navigation';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';

export function MotionSiteHeader({ locale }: { locale: string }) {
  const pathname = usePathname() || '/motion-prompts';
  const suffix = pathname.replace(/^\/(en|zh|ja|ko|fr|de|es|pt)(?=\/|$)/, '') || '/motion-prompts';
  return <OpenPromptsSiteHeader locale={locale} activeNav="motion" langPathSuffix={suffix} />;
}
