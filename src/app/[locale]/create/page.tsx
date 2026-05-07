import { Suspense } from 'react';
import PageComponent from './PageComponent';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <Suspense fallback={null}>
      <PageComponent locale={locale} />
    </Suspense>
  );
}

