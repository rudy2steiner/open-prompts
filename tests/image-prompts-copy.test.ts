import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import en from '../messages/en.json';
import zh from '../messages/zh.json';
import ja from '../messages/ja.json';
import { readFileSync } from 'node:fs';
import { createTranslator } from 'next-intl';

const browsingClaims = {
  en: ['Browse and copy prompts without an account.', 'Browse without an account'],
  zh: ['浏览、复制提示词无需账户。', '浏览无需账户'],
  ja: ['プロンプトの閲覧・コピーにアカウントは不要です。', '閲覧にアカウント不要'],
  ko: ['프롬프트를 둘러보고 복사하는 데는 계정이 필요하지 않습니다.', '둘러보는 데 계정이 필요하지 않습니다'],
  fr: ['Parcourez et copiez les prompts sans compte.', 'Parcourez sans compte'],
  de: ['Stöbern und kopieren Sie Prompts ohne Konto.', 'Stöbern ohne Konto'],
  es: ['Explore y copie prompts sin una cuenta.', 'Explore sin una cuenta'],
  pt: ['Navegue e copie prompts sem uma conta.', 'Navegue sem uma conta'],
};

for (const [locale, [subtitle, note]] of Object.entries(browsingClaims)) {
  test(`${locale}: homepage no-account claims apply to browsing and copying, not creation`, () => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
    const t = createTranslator({ locale, messages, namespace: 'OpenPrompts.homePage.seoContent.cta' });
    assert.ok(t('subtitle').includes(subtitle));
    assert.ok(t('note', { count: 1419 }).startsWith(`${note} ·`));
    assert.ok(t('note', { count: 1419 }).includes('1419'));
  });
}

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
