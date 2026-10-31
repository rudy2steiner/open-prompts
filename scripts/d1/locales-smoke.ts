/** 多语言公开页面只读验收。 */
import { strict as assert } from 'node:assert';
const base = process.argv[2] || 'http://localhost:3103';
const languages = {ko:'이미지',fr:'Images',de:'Bilder',es:'Imágenes',pt:'Imagens'};
async function main() {
  for (const [locale,label] of Object.entries(languages)) {
    const response = await fetch(`${base}/${locale}/image-prompts`, {signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,locale);
    const html = await response.text();
    assert.ok(html.includes(`lang="${locale}"`), `${locale}: document language`);
    assert.ok(new RegExp(`<h1[^>]*>${label}</h1>`).test(html), `${locale}: localized heading`);
    assert.ok(html.includes(`href="${base.includes('localhost') ? 'https://www.open-prompts.com' : base}/${locale}/image-prompts"`), `${locale}: localized URL`);
    console.log(`PASS: ${locale} image prompts, localized heading and language`);
  }
  for (const [locale,path] of [['fr','login'],['ko','motion-prompts']]) {
    const response = await fetch(`${base}/${locale}/${path}`, {signal:AbortSignal.timeout(20000)});
    assert.equal(response.status,200,`${locale}/${path}`);
    assert.ok((await response.text()).includes(`lang="${locale}"`));
    console.log(`PASS: ${locale}/${path}`);
  }
}
main().catch(error => {console.error(error instanceof assert.AssertionError ? error.message : `Locale smoke failed (${error instanceof Error ? error.name : 'unknown error'})`);process.exitCode=1;});
