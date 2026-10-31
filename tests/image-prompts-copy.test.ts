import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import en from '../messages/en.json';
import zh from '../messages/zh.json';
import ja from '../messages/ja.json';

test('navigation, page heading and SEO use the image prompts name in every language', () => {
  for (const [messages, label, seoLabel] of [[en, 'Images', 'Image Prompts'], [zh, '图片', '图片提示词'], [ja, '画像', '画像プロンプト']] as const) {
    const copy = messages.OpenPrompts;
    assert.equal(copy.nav.gallery, label);
    assert.equal(copy.galleryPage.title, label);
    assert.ok(copy.galleryPage.seo.title.startsWith(seoLabel));
    assert.ok(!/Gallery|画廊|ギャラリー/.test(copy.galleryPage.seo.title));
    assert.ok(!/Gallery|画廊|ギャラリー/.test(copy.footer.links.gptGallery));
  }
});
