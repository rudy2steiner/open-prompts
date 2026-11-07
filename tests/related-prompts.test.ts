import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { PromptGalleryItem } from '../src/data/promptGallery';
import { pickRelatedPrompts } from '../src/lib/seo/related-prompts';

function item(partial: Partial<PromptGalleryItem> & Pick<PromptGalleryItem, 'id' | 'title'>): PromptGalleryItem {
  return {
    description: '',
    prompt: '',
    model: 'GPT Image 2',
    tags: [],
    images: [],
    ...partial,
  };
}

test('related prompts stay in the same category before a tag match elsewhere', () => {
  const current = item({ id: 'current', title: 'Current', category: 'artStyles', tags: ['Anime', 'Manga'] });
  const related = pickRelatedPrompts(current, [
    current,
    item({ id: 'same-cat', title: 'Same category', category: 'artStyles', tags: ['Anime'] }),
    item({ id: 'shared', title: 'Shared tags', category: 'portraitPhoto', tags: ['Anime', 'Manga'] }),
  ], 2);
  assert.deepEqual(related.map((entry) => entry.id), ['same-cat', 'shared']);
});
