import { notFound, permanentRedirect } from 'next/navigation';
import { creationTypeHref, resolveCreationType } from '~/lib/generation/creation-types';

type Params = { locale: string; type: string };
type SearchParams = Record<string, string | string[] | undefined>;

export default async function LegacyCreationTypePage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale, type: slug } = await props.params;
  const type = resolveCreationType(slug);
  if (!type) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await props.searchParams)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  const href = creationTypeHref(locale, type.slug);
  permanentRedirect(query.size ? `${href}?${query.toString()}` : href);
}
