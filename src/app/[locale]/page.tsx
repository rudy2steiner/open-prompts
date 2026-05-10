import {unstable_setRequestLocale} from 'next-intl/server';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import PageComponent from "./gallery/PageComponent";

export default async function HomePage({params: {locale = ''}}) {
  unstable_setRequestLocale(locale);
  const prompts = await getPromptGallery();
  return (
    <PageComponent
      locale={locale}
      prompts={prompts}
    />
  );
}
