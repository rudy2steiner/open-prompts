import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import type { CreationMediaLabels } from '../src/components/create/CreationShowcaseMedia';
import messages from '../messages/en.json';

const require = createRequire(import.meta.url);
const previousCssLoader = require.extensions['.css'];
require.extensions['.css'] = () => {};
const { CreationShowcaseMedia } = require('../src/components/create/CreationShowcaseMedia') as typeof import('../src/components/create/CreationShowcaseMedia');
if (previousCssLoader) require.extensions['.css'] = previousCssLoader;
else delete require.extensions['.css'];
import { CREATION_SHOWCASE_MEDIA, resolveCreationShowcaseMedia, resolveCreationSiteDemo } from '../src/lib/generation/creation-showcase-media';

const labels: CreationMediaLabels = {
  ...messages.OpenPrompts.creationTypes.common.media,
  embeddedReference: 'Reference photo included in the result.',
  close: 'Close', prev: 'Previous', next: 'Next', coverLoadFailed: 'Image unavailable',
};

function renderMedia(media: ReturnType<typeof resolveCreationShowcaseMedia>) {
  return renderToStaticMarkup(createElement(CreationShowcaseMedia, {
    media, title: 'Artwork', imageKeyPrefix: 'artwork', needsInput: true, labels,
  }));
}

test('explicit site demos show genuine independent local inputs and every qualified output', () => {
  for (const [id, count] of [['countryside-film-collage-2a70f109', 1], ['gpt-image-2-on-chatgpt-f7a4c7af', 2]] as const) {
    const demo = resolveCreationSiteDemo(id, 'site', 'reference');
    assert.ok(demo);
    const media = resolveCreationShowcaseMedia(demo.outputs, demo);
    const html = renderMedia(media);
    assert.equal(media.inputs.length, 1);
    assert.equal(media.outputs.length, count);
    assert.ok(media.inputs[0].src.startsWith('/creation-references/'));
    assert.ok(media.outputs.every(src => src.startsWith('/creation-results/')));
    assert.ok(!media.outputs.includes(media.inputs[0].src));
    assert.deepEqual(media.unclassified, []);
    assert.match(html, /data-group="inputs"/);
    assert.match(html, /data-group="outputs"/);
    assert.doesNotMatch(html, new RegExp(labels.missingReference));
    assert.equal(demo.count, count);
    assert.equal(demo.resolution, '1k');
    assert.equal(demo.quality, count === 1 ? '1k' : '2k');
    assert.equal(demo.aspectRatio, count === 1 ? '4:5' : '2:3');
    assert.equal(demo.prompt.length, count === 1 ? 1680 : 853);
  }
});

test('site demos cannot be restored by ordinary, mismatched or arbitrary URL context', () => {
  const id = 'gpt-image-2-on-chatgpt-f7a4c7af';
  assert.equal(resolveCreationSiteDemo(id, null, 'reference'), undefined);
  assert.equal(resolveCreationSiteDemo(id, 'site', 'edit'), undefined);
  assert.equal(resolveCreationSiteDemo('unknown', 'site', 'reference'), undefined);
  assert.equal(resolveCreationSiteDemo('https://untrusted.test/image.png', 'site', 'reference'), undefined);
  const demo = resolveCreationSiteDemo(id, 'site', 'reference')!;
  assert.deepEqual(resolveCreationShowcaseMedia(['/catalog/old.jpg'], demo).outputs, [], 'a demo never weakens the caller output whitelist');
});

test('an embedded reference stays hidden without displaying a source caption', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/composite.jpg'], {
    inputs: [{ src: '/media/reference-crop.jpg', origin: { sourceUrl: '/source/post', extractedFrom: '/media/composite.jpg', crop: [0, 0, 100, 100] } }],
    outputs: ['/media/composite.jpg'],
  }));
  assert.doesNotMatch(html, /data-group="inputs"/);
  assert.doesNotMatch(html, /src="\/media\/reference-crop.jpg"/);
  assert.match(html, /data-group="outputs"/);
  assert.match(html, /src="\/media\/composite.jpg"/);
  assert.doesNotMatch(html, /Reference photo included in the result\./);
  assert.doesNotMatch(html, /href="\/source\/post"/);
});

test('embedded originals do not show a redundant incomplete-extraction notice', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/composite.jpg'], {
    inputs: [{ src: '/media/reference-crop.jpg', origin: { sourceUrl: '/source/post', extractedFrom: '/media/composite.jpg', crop: [0, 0, 100, 100] } }],
    outputs: ['/media/composite.jpg'],
    partialInputs: true,
  }));
  assert.doesNotMatch(html, new RegExp(messages.OpenPrompts.creationTypes.common.media.partialReferences));
  assert.doesNotMatch(html, new RegExp(messages.OpenPrompts.creationTypes.common.media.missingReference));
  assert.doesNotMatch(html, /Reference photo included in the result\./);
});

test('mixed references hide only the crop already included in a displayed output', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/composite.jpg'], {
    inputs: [
      { src: '/media/included-crop.jpg', origin: { sourceUrl: '/source/post', extractedFrom: '/media/composite.jpg', crop: [0, 0, 100, 100] } },
      { src: '/media/independent.jpg' },
      { src: '/media/other-crop.jpg', origin: { sourceUrl: '/source/other', extractedFrom: '/media/absent.jpg', crop: [0, 0, 100, 100] } },
      { src: '/media/relationship-only.jpg', origin: { sourceUrl: '/source/post', extractedFrom: '/media/composite.jpg' } },
    ],
    outputs: ['/media/composite.jpg'],
  }));
  const sources = Array.from(html.matchAll(/<img[^>]*src="([^"]+)"/g), match => match[1]);
  assert.deepEqual(sources, ['/media/independent.jpg', '/media/other-crop.jpg', '/media/relationship-only.jpg', '/media/composite.jpg']);
  assert.match(html, /data-group="inputs"/);
});

test('results without standalone inputs are tiled with every image directly accessible', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/a.jpg', '/media/b.jpg'], {
    inputs: [], outputs: ['/media/a.jpg', '/media/b.jpg'],
  }));
  assert.match(html, /class="op-artwork-grid"/);
  assert.doesNotMatch(html, /class="op-artwork-strip"/);
  assert.equal(Array.from(html.matchAll(/tabindex="0"/g)).length, 2);
  assert.match(html, /op-artwork-count"[^>]*>2</);
});

test('separate reference inputs keep their output carousel instead of becoming tiles', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/original.jpg', '/media/a.jpg', '/media/b.jpg'], {
    inputs: [{ src: '/media/original.jpg' }], outputs: ['/media/a.jpg', '/media/b.jpg'],
  }));
  assert.doesNotMatch(html, /class="op-artwork-grid"/);
  assert.equal(Array.from(html.matchAll(/class="op-artwork-strip"/g)).length, 2);
});

test('every composite stays accessible without embedded-reference captions or source links', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/a.jpg', '/media/b.jpg'], {
    inputs: [
      { src: '/media/crop-a.jpg', origin: { sourceUrl: '/source/a', extractedFrom: '/media/a.jpg', crop: [0, 0, 100, 100] } },
      { src: '/media/crop-b.jpg', origin: { sourceUrl: '/source/b', extractedFrom: '/media/b.jpg', crop: [0, 0, 100, 100] } },
    ],
    outputs: ['/media/a.jpg', '/media/b.jpg'],
  }));
  assert.doesNotMatch(html, /href="\/source\/[ab]"/);
  assert.doesNotMatch(html, /op-artwork-origin|Reference photo included in the result\./);
  assert.equal(Array.from(html.matchAll(/<img /g)).length, 2);
});

test('independent original references remain visible beside a clean generated result', () => {
  const html = renderMedia(resolveCreationShowcaseMedia(['/media/original.jpg', '/media/result.jpg'], {
    inputs: [{ src: '/media/original.jpg', origin: { sourceUrl: '/source/post' } }],
    outputs: ['/media/result.jpg'],
  }));
  assert.match(html, /data-group="inputs"/);
  assert.match(html, /src="\/media\/original.jpg"/);
  assert.match(html, /src="\/media\/result.jpg"/);
  assert.doesNotMatch(html, /Reference photo included in the result\./);
});

test('cola storyboard and generated campaign preview form one output-only group', () => {
  const originals = [
    'https://pbs.twimg.com/amplify_video_thumb/2102504103339589632/img/C0k4i2idT6PmxzHY.jpg',
    'https://pbs.twimg.com/media/HS2YV5nb0AAgiKj.jpg?name=orig',
  ];
  const verified = CREATION_SHOWCASE_MEDIA['break-the-ice-cola-b47aa197'];
  for (const images of [originals, [...originals].reverse()]) {
    const media = resolveCreationShowcaseMedia(images, verified);
    assert.deepEqual(media.inputs, []);
    assert.deepEqual(media.outputs, originals);
    assert.deepEqual(media.unclassified, []);
    const html = renderToStaticMarkup(createElement(CreationShowcaseMedia, {
      media, title: 'Break the Ice Cola', imageKeyPrefix: 'cola', needsInput: false, labels,
    }));
    assert.doesNotMatch(html, /data-group="inputs"|data-group="unclassified"/);
    assert.match(html, /class="op-artwork-grid"/);
    assert.equal(Array.from(html.matchAll(/tabindex="0"/g)).length, 2);
    assert.doesNotMatch(html, new RegExp(labels.missingReference));
  }
});

test('unverified catalog images stay visible without guessing input or output roles', () => {
  const media = resolveCreationShowcaseMedia(['/media/a.jpg', '/media/b.jpg']);
  assert.deepEqual(media.inputs, []);
  assert.deepEqual(media.outputs, []);
  assert.deepEqual(media.unclassified, ['/media/a.jpg', '/media/b.jpg']);
  assert.equal(media.partialInputs, false);
});

test('multiple verified inputs are independent of a single output', () => {
  const media = resolveCreationShowcaseMedia(['/media/output.jpg'], {
    inputs: [{ src: '/media/person.jpg' }, { src: '/media/style.jpg' }],
    outputs: ['/media/output.jpg'],
  });
  assert.deepEqual(media.inputs.map(image => image.src), ['/media/person.jpg', '/media/style.jpg']);
  assert.deepEqual(media.outputs, ['/media/output.jpg']);
  assert.deepEqual(media.unclassified, []);
});

test('one input and multiple outputs preserve every result and exclude the input from attachments', () => {
  const media = resolveCreationShowcaseMedia(['/media/result-b.jpg', '/media/reference.jpg', '/media/result-a.jpg'], {
    inputs: [{ src: '/media/reference.jpg' }],
    outputs: ['/media/result-a.jpg', '/media/result-b.jpg'],
  });
  assert.deepEqual(media.inputs.map(image => image.src), ['/media/reference.jpg']);
  assert.deepEqual(media.outputs, ['/media/result-a.jpg', '/media/result-b.jpg']);
  assert.deepEqual(media.unclassified, []);
});

test('missing references never reuse a verified output as an input', () => {
  const media = resolveCreationShowcaseMedia(['/media/result.jpg'], { inputs: [], outputs: ['/media/result.jpg'] });
  assert.deepEqual(media.inputs, []);
  assert.deepEqual(media.outputs, ['/media/result.jpg']);
});

test('partially recovered references retain the incomplete-input status', () => {
  const media = resolveCreationShowcaseMedia(['/media/result.jpg'], {
    inputs: [{ src: '/media/scene.jpg' }],
    outputs: ['/media/result.jpg'],
    partialInputs: true,
  });
  assert.deepEqual(media.inputs.map(image => image.src), ['/media/scene.jpg']);
  assert.equal(media.partialInputs, true);
});

test('extracted references retain provenance while the complete original composite remains an output', () => {
  const media = resolveCreationShowcaseMedia(['/media/composite.jpg'], {
    inputs: [{
      src: '/media/reference-crop.jpg',
      origin: {
        sourceUrl: '/source/post',
        extractedFrom: '/media/composite.jpg',
        originalSize: [1086, 1448],
        crop: [0, 0, 1086, 789],
      },
    }],
    outputs: ['/media/composite.jpg'],
  });
  assert.deepEqual(media.inputs, [{
    src: '/media/reference-crop.jpg',
    origin: {
      sourceUrl: '/source/post',
      extractedFrom: '/media/composite.jpg',
      originalSize: [1086, 1448],
      crop: [0, 0, 1086, 789],
    },
  }]);
  assert.deepEqual(media.outputs, ['/media/composite.jpg']);
});

test('new or unclassified catalog images are retained without reclassifying changed URLs', () => {
  const media = resolveCreationShowcaseMedia(['/media/new.jpg', '/media/result-b.jpg', '/media/result-a.jpg'], {
    inputs: [],
    outputs: ['/media/result-a.jpg', '/media/result-b.jpg', '/media/deleted.jpg'],
  });
  assert.deepEqual(media.outputs, ['/media/result-a.jpg', '/media/result-b.jpg']);
  assert.deepEqual(media.unclassified, ['/media/new.jpg']);
});

test('duplicate catalog URLs do not inflate group counts or hide distinct originals', () => {
  const media = resolveCreationShowcaseMedia(['/media/input.jpg', '/media/result.jpg', '/media/result.jpg', '/media/extra.jpg'], {
    inputs: [{ src: '/media/input.jpg' }],
    outputs: ['/media/result.jpg'],
  });
  assert.deepEqual(media.inputs.map(image => image.src), ['/media/input.jpg']);
  assert.deepEqual(media.outputs, ['/media/result.jpg']);
  assert.deepEqual(media.unclassified, ['/media/extra.jpg']);
});

test('the character source preview is marked as partial video reference rather than a complete original photo', () => {
  const result = '/local_images/gpt-image2-prompts/86_ai-generated-character-reference-sheet_1.jpg';
  const reference = '/local_images/gpt-image2-prompts/86_ai-generated-character-reference-sheet_2.jpg';
  const media = resolveCreationShowcaseMedia([reference, result], CREATION_SHOWCASE_MEDIA['ai-generated-character-reference-sheet-86']);
  assert.deepEqual(media.inputs, [{ src: reference, origin: {
    sourceUrl: 'https://x.com/k_matsumaru/status/2048603197582024861',
    videoPreview: true,
  } }]);
  assert.deepEqual(media.outputs, [result]);
  assert.deepEqual(media.unclassified, []);
  assert.equal(media.partialInputs, true);
});

test('the same-face countryside collage is one complete output without an invented reference panel', () => {
  const output = 'https://pbs.twimg.com/media/HS-f_8hboAAxJX5.jpg?name=orig';
  const verified = CREATION_SHOWCASE_MEDIA['countryside-film-collage-2a70f109'];
  assert.ok(verified);
  const media = resolveCreationShowcaseMedia([output], verified);
  assert.deepEqual(media.inputs, []);
  assert.deepEqual(media.outputs, [output]);
  assert.deepEqual(media.unclassified, []);
  assert.equal(media.partialInputs, false);
  const html = renderMedia(media);
  assert.match(html, new RegExp(messages.OpenPrompts.creationTypes.common.media.missingReference));
  assert.doesNotMatch(html, /data-group="inputs"/);
  assert.match(html, /op-artwork-count"[^>]*>1</);
});

test('brand campaign posters are two outputs, never a guessed before-and-after pair', () => {
  const outputs = ['https://pbs.twimg.com/media/HOJzDczWQAAg1Q6.jpg?name=orig', 'https://pbs.twimg.com/media/HOJzDc2XwAAvigY.jpg?name=orig'];
  const verified = CREATION_SHOWCASE_MEDIA['gpt-image-2-on-chatgpt-f7a4c7af'];
  assert.ok(verified);
  const media = resolveCreationShowcaseMedia([...outputs].reverse(), verified);
  assert.deepEqual(media.inputs, []);
  assert.deepEqual(media.outputs, outputs);
  assert.deepEqual(media.unclassified, []);
  const html = renderMedia(media);
  assert.match(html, new RegExp(messages.OpenPrompts.creationTypes.common.media.missingReference));
  assert.doesNotMatch(html, /data-group="inputs"/);
  assert.match(html, /op-artwork-count"[^>]*>2</);
});

test('restored portraits retain both composites and source-matched extracted old-photo regions', () => {
  const outputs = ['https://pbs.twimg.com/media/HS2NTU8WAAAmclT.jpg?name=orig', 'https://pbs.twimg.com/media/HS2NTU4XoAA0BUJ.jpg?name=orig'];
  const media = resolveCreationShowcaseMedia([...outputs].reverse(), CREATION_SHOWCASE_MEDIA['vintage-photo-restoration-a36b15f4']);
  assert.deepEqual(media.inputs.map(image => image.src), [
    '/creation-references/vintage-photo-restoration-couple-reference.jpg',
    '/creation-references/vintage-photo-restoration-portrait-reference.jpg',
  ]);
  assert.deepEqual(media.inputs.map(image => image.origin?.extractedFrom), outputs);
  assert.deepEqual(media.outputs, outputs);
  assert.deepEqual(media.unclassified, []);
  assert.equal(media.partialInputs, true);
});

test('product retouching preserves the independently verified before and after photos in either catalog order', () => {
  const input = 'https://pbs.twimg.com/media/HG0vL2oaEAAfTOR.jpg?name=orig';
  const output = 'https://pbs.twimg.com/media/HG0vLkbaIAA30oz.jpg?name=orig';
  const verified = CREATION_SHOWCASE_MEDIA['professional-beverage-pho-a092d406'];
  for (const images of [[output, input], [input, output]]) {
    const media = resolveCreationShowcaseMedia(images, verified);
    assert.deepEqual(media.inputs, [{ src: input, origin: { sourceUrl: 'https://x.com/abxxai/status/2048345290043015628' } }]);
    assert.deepEqual(media.outputs, [output]);
    assert.deepEqual(media.unclassified, []);
    assert.equal(media.partialInputs, false);
  }
});

test('the product reference and new-scene result use verified source roles regardless of gallery order', () => {
  const input = 'https://pbs.twimg.com/media/HGvvVaVbIAAo-ov.jpg?name=orig';
  const output = 'https://pbs.twimg.com/media/HGvvVaUbEAEndaM.jpg?name=orig';
  for (const images of [[output, input], [input, output]]) {
    const media = resolveCreationShowcaseMedia(images, CREATION_SHOWCASE_MEDIA['professional-food-photogr-80786513']);
    assert.deepEqual(media.inputs.map(image => image.src), [input]);
    assert.deepEqual(media.outputs, [output]);
    assert.deepEqual(media.unclassified, []);
    assert.equal(media.partialInputs, false);
  }
});
