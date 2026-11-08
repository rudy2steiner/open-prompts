import { setRequestLocale } from 'next-intl/server';
import { SupportDocumentPage, supportMetadata } from '~/components/support/SupportDocumentPage';
import { normalizeLocale } from '~/lib/seo/metadata';

export const generateMetadata = supportMetadata('cookies');

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const locale = normalizeLocale((await params).locale);
  setRequestLocale(locale);
  return <SupportDocumentPage locale={locale} type="cookies" />;
}
