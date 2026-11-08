import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTranslator} from 'next-intl';
import {readFileSync} from 'node:fs';
import {downloadCatalogItems, loadPromptDownloadImage} from '../src/lib/prompts/prompt-download';

test('chooser catalog includes the first available image and counts all original image files', () => {
  assert.deepEqual(downloadCatalogItems([{id:'one', title:'Artwork',description:'',prompt:'Complete',model:'GPT Image 2',tags:[],images:['', '/local_images/one.jpg', '/local_images/two.jpg']}, {id:'none',title:'Text only',description:'',prompt:'Text',model:'GPT Image 2',tags:[],images:[]}]), [
    {id:'one',title:'Artwork',model:'GPT Image 2',previewSrc:'/local_images/one.jpg',imageCount:2},
    {id:'none',title:'Text only',model:'GPT Image 2',previewSrc:null,imageCount:0},
  ]);
});

test('existing embedded catalog images are exportable without external requests or SVG execution', async () => {
  const source = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
  const image = await loadPromptDownloadImage(source,{origin:'https://www.open-prompts.com',fetcher:async()=>{assert.fail('Embedded images must not fetch');}});
  assert.equal(image.contentType,'image/png');
  assert.equal(Buffer.from(image.bytes).toString('base64'),source.split(',')[1]);
  await assert.rejects(loadPromptDownloadImage('data:image/svg+xml;base64,PHN2Zy8+', {origin:'https://www.open-prompts.com'}));
});

for (const locale of ['en','zh','ja','ko','fr','de','es','pt']) {
  test(`${locale}: both archive formats have usable chooser, progress and failure messages`, () => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`,'utf8'));
    const t = createTranslator({locale,messages,namespace:'OpenPrompts.gallery'});
    assert.equal(t('downloadHtml'),'HTML');
    assert.equal(t('downloadZip'),'ZIP');
    for (const key of ['downloadFormat','downloadHtmlHint','downloadZipHint','downloadPackaging','downloadExportFailed','downloadImageMode','downloadImagesEmbedded','downloadImagesLinks','downloadImagesLinksHint','downloadCacheProgress','downloadCacheComplete','downloadCacheIncomplete','downloadCacheUnavailable','downloadCacheHint']) {
      assert.ok(t(key).trim().length > 1);
      assert.ok(!t(key).startsWith('OpenPrompts.'));
    }
  });
}
