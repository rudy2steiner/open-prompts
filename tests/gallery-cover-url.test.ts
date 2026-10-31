import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { galleryCoverUrl } from '../src/lib/prompts/gallery-cover-url';

test('gallery requests medium X covers while leaving original values untouched', () => {
  const original = 'https://pbs.twimg.com/media/example?format=jpg&name=orig';
  const preview = new URL(galleryCoverUrl(original)!);
  assert.equal(preview.searchParams.get('name'), 'medium');
  assert.equal(preview.searchParams.get('format'), 'jpg');
  assert.ok(original.endsWith('name=orig'));
});
test('other media and invalid or missing sources are left unchanged', () => {
  for (const source of [undefined, 'https://example.com/photo.png', 'data:image/png;base64,abc', '/local.webp', 'https://pbs.twimg.com/profile_images/avatar.jpg']) {
    assert.equal(galleryCoverUrl(source), source);
  }
});
