export type CreationReferenceImage = {
  src: string;
  origin?: {
    sourceUrl: string;
    videoPreview?: boolean;
    extractedFrom?: string;
    originalSize?: readonly [number, number];
    crop?: readonly [number, number, number, number];
  };
};

import type { ImageResolution } from './types';

export type CreationSiteDemo = {
  inputs: readonly CreationReferenceImage[];
  outputs: readonly string[];
  referenceLibraryId: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: ImageResolution;
  quality: string;
  count: number;
};

export type VerifiedCreationMedia = {
  siteDemo?: CreationSiteDemo;
  inputs: readonly CreationReferenceImage[];
  outputs: readonly string[];
  partialInputs?: boolean;
  contentMismatch?: boolean;
  promptDescriptionOnly?: boolean;
};

export type CreationShowcaseMedia = {
  inputs: CreationReferenceImage[];
  outputs: string[];
  unclassified: string[];
  partialInputs: boolean;
};

export const CREATION_SHOWCASE_MEDIA: Record<string, VerifiedCreationMedia> = {
  'candid-street-fashion-4e88f95c': {
    inputs: [],
    outputs: [
      'https://pbs.twimg.com/media/HU23TzbbAAAgCLd.jpg?name=orig',
      'https://pbs.twimg.com/media/HU23TzkacAAZYnd.jpg?name=orig',
      'https://pbs.twimg.com/media/HU23TzdaQAARLSi.jpg?name=orig',
    ],
  },
  'candid-park-portrait-c0cdb8a7': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HRQu_OHbAAAW-TS.jpg?name=orig', 'https://pbs.twimg.com/media/HRQu_5paAAA0822.jpg?name=orig'],
  },
  'raised-city-diorama-5f1ba47b': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HSkb5RSbMAAxyLq.jpg?name=orig', 'https://pbs.twimg.com/media/HSkb5RybQAAbs1s.jpg?name=orig'],
  },
  'japanese-bookstore-oni-ta-0974b179': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HGgXjNSaQAAgd8F.jpg?name=orig'],
  },
  'wildlife-infographic-image-created-using-gpt-image-7423ba5d': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HH450E1bIAExZE2.jpg?name=orig'],
  },
  'social-media-content-inte-1d046dc1': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HGaWgEFboAAL023.png?name=orig'],
  },
  'break-the-ice-cola-b47aa197': {
    inputs: [],
    outputs: [
      'https://pbs.twimg.com/amplify_video_thumb/2102504103339589632/img/C0k4i2idT6PmxzHY.jpg',
      'https://pbs.twimg.com/media/HS2YV5nb0AAgiKj.jpg?name=orig',
    ],
  },
  'watercolor-photo-vignette-76967165': {
    inputs: [
      {
        src: '/creation-references/watercolor-lakeside-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/Sairah_0/status/2097552949862097218',
          extractedFrom: 'https://pbs.twimg.com/media/HRwBR6UaQAA40-1.jpg?name=orig',
          originalSize: [1086, 1448], crop: [0, 0, 1086, 789],
        },
      },
      {
        src: '/creation-references/watercolor-cats-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/Sairah_0/status/2097552949862097218',
          extractedFrom: 'https://pbs.twimg.com/media/HRwBR6ZaIAAhEdX.jpg?name=orig',
          originalSize: [1086, 1448], crop: [0, 0, 1086, 762],
        },
      },
    ],
    outputs: ['https://pbs.twimg.com/media/HRwBR6UaQAA40-1.jpg?name=orig', 'https://pbs.twimg.com/media/HRwBR6ZaIAAhEdX.jpg?name=orig'],
  },
  'countryside-film-collage-2a70f109': {
    siteDemo: {
      inputs: [{ src: '/creation-references/site-countryside-portrait.jpg' }],
      outputs: ['/creation-results/site-countryside-collage.png'],
      referenceLibraryId: 'candid-park-portrait-c0cdb8a7',
      model: 'GPT Image 2', aspectRatio: '4:5', resolution: '1k', quality: '1k', count: 1,
      prompt: `Create an ultra-realistic cinematic 4:5 vintage-modern fashion collage using the uploaded photo as the ONLY facial identity reference. Keep the exact same face, facial features, skin tone, proportions, hairstyle, and natural skin texture in all 5 frames. No face alteration, beautification, or identity change.

Create 5 naturally overlapping photos of the same woman in a peaceful rustic countryside garden with a vintage cottage, flowers, trees, wooden fences, and warm late-afternoon sunlight:

1. Hero: Large center-left portrait holding a small wildflower bouquet, smiling at camera.

2. Upper-right: Standing full/three-quarter portrait, touching hair and holding flowers, pastel floral blouse with beige trousers.

3. Middle-right: Waist-up portrait near a rustic garden structure, wearing a powder-blue floral blouse.

4. Lower-left: Relaxed seated portrait on a wooden bench, cream floral blouse with dark high-waisted bottom.

5. Lower-right: Full-body walking portrait with a small vintage shoulder bag, blue floral blouse and beige trousers.

Use soft vintage floral clothing in cream, ivory, dusty pink, powder blue, beige and navy. Natural wavy hair, minimal jewelry, realistic fabric and flower details.

Style: High-end DSLR fashion editorial, 1990s/early-2000s vintage aesthetic, soft golden-hour light, cinematic bokeh, subtle film grain, muted pastel colors, realistic skin, natural anatomy, photorealistic 8K quality.

Negative: Different face, identity change, face swap, plastic skin, excessive makeup, distorted hands/fingers, extra limbs, duplicate people, inconsistent hairstyle, inconsistent lighting, logos, text, watermark, borders, artificial AI look.`,
    },
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HS-f_8hboAAxJX5.jpg?name=orig'],
  },
  'ai-generated-character-reference-sheet-86': {
    inputs: [{
      src: '/local_images/gpt-image2-prompts/86_ai-generated-character-reference-sheet_2.jpg',
      origin: {
        sourceUrl: 'https://x.com/k_matsumaru/status/2048603197582024861',
        videoPreview: true,
      },
    }],
    outputs: ['/local_images/gpt-image2-prompts/86_ai-generated-character-reference-sheet_1.jpg'],
    partialInputs: true,
  },
  'vintage-photo-restoration-a36b15f4': {
    inputs: [
      {
        src: '/creation-references/vintage-photo-restoration-couple-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/visualaiclub/status/2102491975173763172',
          extractedFrom: 'https://pbs.twimg.com/media/HS2NTU8WAAAmclT.jpg?name=orig',
          originalSize: [960, 1280], crop: [99, 946, 285, 1185],
        },
      },
      {
        src: '/creation-references/vintage-photo-restoration-portrait-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/visualaiclub/status/2102491975173763172',
          extractedFrom: 'https://pbs.twimg.com/media/HS2NTU4XoAA0BUJ.jpg?name=orig',
          originalSize: [960, 1280], crop: [99, 946, 285, 1185],
        },
      },
    ],
    outputs: ['https://pbs.twimg.com/media/HS2NTU8WAAAmclT.jpg?name=orig', 'https://pbs.twimg.com/media/HS2NTU4XoAA0BUJ.jpg?name=orig'],
    partialInputs: true,
  },
  'gpt-image-2-on-chatgpt-f7a4c7af': {
    siteDemo: {
      inputs: [{ src: '/creation-references/site-cola-product.jpg' }],
      outputs: ['/creation-results/site-cola-poster-1.png', '/creation-results/site-cola-poster-2.png'],
      referenceLibraryId: 'professional-beverage-pho-a092d406',
      model: 'GPT Image 2', aspectRatio: '2:3', resolution: '1k', quality: '2k', count: 2,
      prompt: `Create a vertical 2:3 premium beverage advertising poster using the uploaded photograph as the sole product reference. Preserve the Coca-Cola cup, its recognizable red logo panel, clear plastic shape, ice, cola and white straw; do not invent a different package or brand. Replace the park background with a clean red-and-dark studio scene, crisp lighting and subtle condensation. Let the hero cup occupy about 70% of the composition. Use the original logo near the upper left. Include only these English copy lines: headline "Cold. Crisp. Classic.", subheadline "A refreshing pause.", and four compact notes "Served chilled", "With ice", "Cola flavor", "Fizzy refreshment". Add two small detail views of the same cup near the bottom. Keep all text readable and the layout balanced. Do not add health claims, endorsements, unrelated brands or watermarks.`,
    },
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HOJzDczWQAAg1Q6.jpg?name=orig', 'https://pbs.twimg.com/media/HOJzDc2XwAAvigY.jpg?name=orig'],
  },
  'professional-food-photogr-80786513': {
    inputs: [{
      src: 'https://pbs.twimg.com/media/HGvvVaVbIAAo-ov.jpg?name=orig',
      origin: { sourceUrl: 'https://x.com/mikko_20100518/status/2047993622663221640' },
    }],
    outputs: ['https://pbs.twimg.com/media/HGvvVaUbEAEndaM.jpg?name=orig'],
  },
  'professional-beverage-pho-a092d406': {
    inputs: [{
      src: 'https://pbs.twimg.com/media/HG0vL2oaEAAfTOR.jpg?name=orig',
      origin: { sourceUrl: 'https://x.com/abxxai/status/2048345290043015628' },
    }],
    outputs: ['https://pbs.twimg.com/media/HG0vLkbaIAA30oz.jpg?name=orig'],
    promptDescriptionOnly: true,
  },
  'urban-identity-editorial-e702ffff': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HTW5MakacAAD1-A.jpg?name=orig'],
    partialInputs: true,
  },
  'burgundy-urban-portrait-3523fe0b': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HTsct53aQAAhfwe.jpg?name=orig'],
    partialInputs: true,
  },
  'hand-drawn-travel-journal-57d01f1b': {
    inputs: [
      {
        src: '/creation-references/hand-drawn-travel-journal-fuji-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/ahmadmalik375/status/2102253407126081699',
          extractedFrom: 'https://pbs.twimg.com/media/HSy0Tz-bAAAlh5x.jpg?name=orig',
          originalSize: [1024, 1536], crop: [0, 0, 1024, 723],
        },
      },
      {
        src: '/creation-references/hand-drawn-travel-journal-dubai-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/ahmadmalik375/status/2102253407126081699',
          extractedFrom: 'https://pbs.twimg.com/media/HSy0Ur0asAEEBGW.jpg?name=orig',
          originalSize: [1024, 1536], crop: [0, 0, 1024, 768],
        },
      },
    ],
    outputs: ['https://pbs.twimg.com/media/HSy0Tz-bAAAlh5x.jpg?name=orig', 'https://pbs.twimg.com/media/HSy0Ur0asAEEBGW.jpg?name=orig'],
  },
  'travel-field-notes-458ca2b0': {
    inputs: [
      {
        src: '/creation-references/travel-field-notes-tokyo-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/saniaspeaks_/status/2101632213939060859',
          extractedFrom: 'https://pbs.twimg.com/media/HSp_V94WkAAJLE6.jpg?name=orig',
          originalSize: [1086, 1448], crop: [0, 0, 610, 1448],
        },
      },
      {
        src: '/creation-references/travel-field-notes-osaka-reference.jpg',
        origin: {
          sourceUrl: 'https://x.com/saniaspeaks_/status/2101632213939060859',
          extractedFrom: 'https://pbs.twimg.com/media/HSp_WuJXIAArwEm.jpg?name=orig',
          originalSize: [1086, 1448], crop: [0, 0, 610, 1448],
        },
      },
    ],
    outputs: ['https://pbs.twimg.com/media/HSp_V94WkAAJLE6.jpg?name=orig', 'https://pbs.twimg.com/media/HSp_WuJXIAArwEm.jpg?name=orig'],
  },
  'premium-wireless-headphon-bcae14fa': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HGgjdt5XUAIJ_n-.jpg?name=orig'],
    partialInputs: true,
  },
  'custom-minifigure-set-16b6425d': {
    inputs: [{
      src: '/creation-references/custom-minifigure-set-reference.jpg',
      origin: {
        sourceUrl: 'https://x.com/visualaiclub/status/2104203933308633179',
        extractedFrom: 'https://pbs.twimg.com/media/HTOhYAeWEAIjn5e.jpg?name=orig',
        originalSize: [2160, 2880], crop: [1548, 2148, 1944, 2650],
      },
    }],
    outputs: ['https://pbs.twimg.com/media/HTOhYAeWEAIjn5e.jpg?name=orig'],
  },
  'grayscale-vector-city-888d0fdd': { inputs: [], outputs: [], partialInputs: true },
  'illustrated-city-panorama-d355425b': { inputs: [], outputs: [] },
  'identity-swap-portrait-c8f5d390': { inputs: [], outputs: [] },
  'ferris-wheel-fashion-ink-f2c707f5': {
    inputs: [
      {
        src: '/creation-references/ferris-wheel-fashion-ink-f2c707f5-reference-1.jpg',
        origin: {
          sourceUrl: 'https://x.com/visualaiclub/status/2106420974258123246',
          extractedFrom: 'https://pbs.twimg.com/media/HTuCtMeXAAAqx0J.jpg?name=orig',
          originalSize: [960, 1280], crop: [100, 950, 284, 1056],
        },
      },
      {
        src: '/creation-references/ferris-wheel-fashion-ink-f2c707f5-reference-2.jpg',
        origin: {
          sourceUrl: 'https://x.com/visualaiclub/status/2106420974258123246',
          extractedFrom: 'https://pbs.twimg.com/media/HTuCtMeXAAAqx0J.jpg?name=orig',
          originalSize: [960, 1280], crop: [100, 1056, 284, 1180],
        },
      },
    ],
    outputs: ['https://pbs.twimg.com/media/HTuCtMeXAAAqx0J.jpg?name=orig'],
    partialInputs: true,
    contentMismatch: true,
  },
  'retro-reference-portrait-5b948ad2': {
    inputs: [],
    outputs: ['https://pbs.twimg.com/media/HTI0KHNbkAAIOyk.jpg?name=orig'],
    partialInputs: true,
  },
};

export function resolveCreationSiteDemo(templateId: string, context: string | null | undefined, mode: string | null | undefined): CreationSiteDemo | undefined {
  if (context !== 'site' || mode !== 'reference') return undefined;
  return CREATION_SHOWCASE_MEDIA[templateId]?.siteDemo;
}

export function resolveCreationShowcaseMedia(
  images: readonly string[],
  verified?: VerifiedCreationMedia,
): CreationShowcaseMedia {
  const originals = Array.from(new Set(images));
  const originalUrls = new Set(originals);
  const inputs = Array.from(new Map((verified?.inputs ?? []).map(image => [image.src, image])).values());
  const inputUrls = new Set(inputs.map(image => image.src));
  const outputs = Array.from(new Set(verified?.outputs ?? [])).filter(src => originalUrls.has(src) && !inputUrls.has(src));
  const outputUrls = new Set(outputs);
  return {
    inputs,
    outputs,
    unclassified: originals.filter(src => !inputUrls.has(src) && !outputUrls.has(src)),
    partialInputs: verified?.partialInputs ?? false,
  };
}
