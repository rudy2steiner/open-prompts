import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import * as promptCategories from '../src/lib/prompts/prompt-categories';

const prompts = [
  {
    id: 'portrait',
    title: 'Editorial Portrait',
    description: 'Studio fashion',
    prompt: 'soft light',
    model: 'GPT Image 2',
    category: 'portraitPhoto',
    tags: ['Portrait', 'Editorial'],
    images: ['/portrait.jpg'],
  },
  {
    id: 'product',
    title: 'Coffee Package',
    description: 'Retail box',
    prompt: 'clean product shot',
    model: 'Flux',
    category: 'productCommercial',
    tags: ['Product', 'Brand'],
    images: ['/product.jpg'],
  },
] as const;

test('gallery client filter combines model, category, sub-tag, and query', () => {
  const filterPromptGalleryItems = (promptCategories as any).filterPromptGalleryItems;
  assert.equal(typeof filterPromptGalleryItems, 'function');

  assert.deepEqual(
    filterPromptGalleryItems(prompts, {
      model: 'GPT Image 2',
      categoryId: 'portraitPhoto',
      subTag: 'Editorial',
      query: 'soft',
    }).map((item: { id: string }) => item.id),
    ['portrait'],
  );

  assert.deepEqual(
    filterPromptGalleryItems(prompts, {
      model: 'all',
      categoryId: 'all',
      subTag: null,
      query: 'coffee',
    }).map((item: { id: string }) => item.id),
    ['product'],
  );
});
