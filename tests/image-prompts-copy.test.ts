import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import en from '../messages/en.json';
import zh from '../messages/zh.json';
import ja from '../messages/ja.json';

test('navigation, page heading and SEO use the image prompts name in every language', () => {
  for (const [messages, seoLabel, motionLabel] of [[en, 'Image Prompts', 'Motion Prompts'], [zh, '图片提示词', '动效提示词'], [ja, '画像プロンプト', 'モーションプロンプト']] as const) {
    const copy = messages.OpenPrompts;
    assert.equal(copy.nav.gallery, seoLabel);
    assert.equal(copy.nav.motion, motionLabel);
    assert.ok(copy.promptMotionPage.seo.title.includes(motionLabel));
    assert.equal(copy.galleryPage.title, seoLabel);
    assert.ok(copy.galleryPage.seo.title.includes(seoLabel));
    assert.ok(!/Gallery|画廊|ギャラリー/.test(copy.galleryPage.seo.title));
    assert.ok(!/Gallery|画廊|ギャラリー/.test(copy.footer.links.gptGallery));
  }
});
