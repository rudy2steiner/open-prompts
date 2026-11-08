import test from 'node:test';
import assert from 'node:assert/strict';
import type { PromptGalleryItem } from '../src/data/promptGallery';
import { pickCreationTypeInspiration, pickCreationTypeLandingExamples, pickCreationTypeShowcase } from '../src/lib/generation/creation-types';

function artwork(id: string, prompt: string): PromptGalleryItem {
  return { id, title: id, description: '', prompt, model: 'GPT Image 2', tags: [], images: [`/artwork/${id}.jpg`] };
}

const text = [
  artwork('photoreal', 'A photorealistic photograph shot on 35mm film.'),
  artwork('typography', 'A poster with bold typography and a headline.'),
  artwork('infographic', 'An infographic with labeled diagrams and annotations.'),
  artwork('product', 'A commercial product shot of perfume packaging.'),
  artwork('extra-product', 'An e-commerce product photo of a bottle.'),
];
const reference = [
  artwork('character', 'Create a character reference sheet using the uploaded photo, with consistent identity and multiple poses.'),
  artwork('portrait', 'Create a portrait avatar from the reference photo.'),
  artwork('style', 'Paint the uploaded photo in watercolor illustration style.'),
  artwork('series', 'Create a comic storyboard series for each uploaded photo.'),
];
const edit = [
  artwork('toy', 'Transform this photo into a collectible toy figurine.'),
  artwork('restyle', 'Turn this photo into a vector illustration.'),
  artwork('poster', 'Edit the uploaded photo into a magazine cover poster.'),
  artwork('swap', 'Replace the face in the uploaded photo with an identity replacement.'),
];
const pool = [...edit, ...text, ...reference];

for (const mode of ['text', 'reference', 'edit'] as const) {
  test(`${mode} inspiration does not substitute keyword matches for missing curated examples`, () => {
    assert.deepEqual(pickCreationTypeInspiration(pool, mode), []);
  });
}

test('missing matching artwork never falls back to another creation mode', () => {
  assert.deepEqual(pickCreationTypeInspiration(edit, 'reference'), []);
  assert.deepEqual(pickCreationTypeInspiration(reference, 'edit'), []);
  assert.deepEqual(pickCreationTypeInspiration([...reference, ...edit], 'text'), []);
  assert.deepEqual(pickCreationTypeInspiration([], 'text'), []);
});

test('duplicates and incomplete entries do not crowd out usable inspiration', () => {
  const candidates = [
    { ...text[0], id: 'missing-image', images: [] },
    { ...text[1], id: 'missing-prompt', prompt: ' ' },
    text[0], text[0], text[1], text[2], text[3], text[4],
  ];
  assert.deepEqual(pickCreationTypeInspiration(candidates, 'text'), []);
});

const landingTemplates = [
  artwork('candid-street-fashion-4e88f95c', 'A candid street fashion photograph.'),
  artwork('candid-park-portrait-c0cdb8a7', 'A photorealistic outdoor park portrait.'),
  artwork('raised-city-diorama-5f1ba47b', 'An architectural diorama travel poster.'),
  artwork('japanese-bookstore-oni-ta-0974b179', 'Japanese book titles in a bookstore.'),
  artwork('wildlife-infographic-image-created-using-gpt-image-7423ba5d', 'A wildlife infographic.'),
  artwork('social-media-content-inte-1d046dc1', 'A social media interface screenshot.'),
  artwork('break-the-ice-cola-b47aa197', 'A cinematic cola advertising storyboard.'),
  artwork('watercolor-photo-vignette-76967165', 'Create a watercolor artwork from the uploaded photograph.'),
  artwork('ai-generated-character-reference-sheet-86', 'A character sheet with consistent facial identity.'),
  artwork('countryside-film-collage-2a70f109', 'Use the uploaded photo as the only facial identity reference for all five portraits.'),
  artwork('hand-drawn-travel-journal-57d01f1b', 'Transform the uploaded photograph into a travel journal illustration.'),
  artwork('travel-field-notes-458ca2b0', 'Create a separate travel poster for each uploaded photograph.'),
  artwork('professional-food-photogr-80786513', 'この写真をプロが撮った写真の様に加工してみて。構図は変えても構わないよ。'),
  artwork('gpt-image-2-on-chatgpt-f7a4c7af', 'Use only one uploaded product image. Preserve its brand and build an advertising scene around its colors.'),
  artwork('custom-minifigure-set-16b6425d', 'Transform the uploaded photograph into minifigures.'),
  artwork('vintage-photo-restoration-a36b15f4', 'Restore the uploaded vintage photograph while preserving identity and composition.'),
  artwork('professional-beverage-pho-a092d406', 'A transformation of a casual drink photo into a professional product shot.'),
];

test('workspace inspiration follows the latest landing examples and uses qualified site-demo results without mutating catalog data', () => {
  const snapshot = structuredClone(landingTemplates);
  for (const mode of ['text', 'reference', 'edit'] as const) {
    const inspiration = pickCreationTypeInspiration(landingTemplates, mode);
    const examples = pickCreationTypeLandingExamples(landingTemplates, mode);
    assert.deepEqual(inspiration.map(item => item.id), [examples.hero!.id, ...examples.showcase.map(item => item.prompt.id)]);
    assert.equal(new Set(inspiration.map(item => item.id)).size, inspiration.length);
  }
  const referenceInspiration = pickCreationTypeInspiration(landingTemplates, 'reference');
  assert.equal(referenceInspiration[0].id, 'watercolor-photo-vignette-76967165');
  assert.deepEqual(referenceInspiration[1].images, ['/creation-results/site-countryside-collage.png']);
  assert.equal(referenceInspiration[1].prompt.length, 1680);
  assert.deepEqual(referenceInspiration[4].images, ['/creation-results/site-cola-poster-1.png', '/creation-results/site-cola-poster-2.png']);
  assert.equal(referenceInspiration[4].prompt.length, 853);
  assert.deepEqual(landingTemplates, snapshot);
});

test('landing examples reserve each template for one mode, including the three heroes', () => {
  assert.equal(typeof pickCreationTypeLandingExamples, 'function');
  for (const candidates of [landingTemplates, [...landingTemplates].reverse()]) {
    const pages = ['text', 'reference', 'edit'].map(mode => pickCreationTypeLandingExamples(candidates, mode as 'text' | 'reference' | 'edit'));
    const selected = pages.flatMap(page => [page.hero?.id, ...page.showcase.map(item => item.prompt.id)]);
    assert.equal(new Set(selected).size, selected.length);
    assert.deepEqual(pages.map(page => page.hero?.id), ['candid-street-fashion-4e88f95c', 'watercolor-photo-vignette-76967165', 'vintage-photo-restoration-a36b15f4']);
    assert.deepEqual(pages[1].showcase.map(item => item.prompt.id), [
      'countryside-film-collage-2a70f109',
      'hand-drawn-travel-journal-57d01f1b',
      'travel-field-notes-458ca2b0',
      'gpt-image-2-on-chatgpt-f7a4c7af',
      'custom-minifigure-set-16b6425d',
    ]);
    assert.deepEqual(pages[2].showcase.map(item => item.prompt.id), ['professional-beverage-pho-a092d406']);
  }
});

test('reference landing replaces the rejected character sheet without removing the identity example', () => {
  const { showcase } = pickCreationTypeLandingExamples(landingTemplates, 'reference');
  const character = showcase.find(item => item.capability === 'character');
  assert.ok(character);
  assert.notEqual(character.prompt.id, 'ai-generated-character-reference-sheet-86');
});

test('reference landing uses a product scene rather than food-photo retouching', () => {
  const { showcase } = pickCreationTypeLandingExamples(landingTemplates, 'reference');
  const productScene = showcase.find(item => item.capability === 'productScene');
  assert.ok(productScene);
  assert.notEqual(productScene.prompt.id, 'professional-food-photogr-80786513');
});

test('missing or incomplete curated artwork never substitutes a keyword match from another mode', () => {
  assert.equal(typeof pickCreationTypeLandingExamples, 'function');
  const candidates = [
    ...landingTemplates.filter(item => item.id !== 'professional-beverage-pho-a092d406'),
    { ...landingTemplates[0], images: [] },
    { ...landingTemplates[7], prompt: ' ' },
    artwork('unverified-edit', 'Edit the uploaded photo into a collectible toy poster with retouching.'),
  ];
  assert.deepEqual(pickCreationTypeLandingExamples(candidates, 'edit').showcase, []);
  assert.deepEqual(pickCreationTypeLandingExamples([], 'reference'), { hero: undefined, showcase: [] });
  assert.equal(pickCreationTypeLandingExamples([{ ...landingTemplates[0], images: [] }], 'text').hero, undefined);
  assert.equal(pickCreationTypeLandingExamples([{ ...landingTemplates[7], prompt: ' ' }], 'reference').hero, undefined);
});

test('reference showcases prefer verified pairs over keyword-heavy entries without displacing the pinned travel and figure cases', () => {
  const candidates = [
    artwork('unverified-reference', 'Use the uploaded photo with consistent identity, the same person and same face for a portrait avatar and a brand product campaign advert.'),
    artwork('ai-generated-character-reference-sheet-86', 'Character sheet, multiple angles of the same person, high facial consistency, stylish spring outfit, --ar 16:9'),
    artwork('vintage-photo-restoration-a36b15f4', 'Restoration of the uploaded vintage photograph into a sharp modern digital portrait. Preserve the original facial identity.'),
    artwork('professional-food-photogr-80786513', 'この写真をプロが撮った写真の様に、明るく美味しそうになるように加工してみて。構図は変えても構わないよ。'),
    artwork('travel-field-notes-458ca2b0', 'Create a travel poster series using the uploaded photo.'),
    artwork('custom-minifigure-set-16b6425d', 'Create a collectible toy figurine using the uploaded photo.'),
    reference[2],
  ];
  for (const pool of [candidates, [...candidates].reverse()]) {
    const showcase = pickCreationTypeShowcase(pool, 'reference');
    assert.deepEqual(showcase.map(item => [item.capability, item.prompt.id]), [
      ['character', 'ai-generated-character-reference-sheet-86'],
      ['portrait', 'vintage-photo-restoration-a36b15f4'],
      ['style', 'style'],
      ['series', 'travel-field-notes-458ca2b0'],
      ['productScene', 'professional-food-photogr-80786513'],
      ['figure', 'custom-minifigure-set-16b6425d'],
    ]);
  }
});
