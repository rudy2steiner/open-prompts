import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createAtlascloudProviderWithOptions, pickAtlasSize } from '../src/lib/generation/providers/atlascloud';
import * as atlascloud from '../src/lib/generation/providers/atlascloud';
import { parseHistory } from '../src/lib/create/history';
import { quoteImageCredits } from '../src/lib/billing/quotes';
import { decideGeneration } from '../src/lib/billing/generation-charge';

const sizes = [
  ['1:1', '1k', 1024, 1024], ['16:9', '1k', 1536, 864], ['9:16', '1k', 864, 1536],
  ['4:3', '1k', 1024, 768], ['3:4', '1k', 768, 1024], ['5:4', '1k', 1280, 1024],
  ['4:5', '1k', 1024, 1280], ['2:1', '1k', 1536, 768], ['3:2', '1k', 1536, 1024],
  ['2:3', '1k', 1024, 1536], ['1:1', '2k', 2048, 2048], ['16:9', '2k', 2048, 1152],
  ['9:16', '2k', 1152, 2048], ['4:3', '2k', 2048, 1536], ['3:2', '2k', 2048, 1360],
  ['16:9', '4k', 3840, 2160], ['9:16', '4k', 2160, 3840],
] as const;

test('resolution changes actual dimensions without collapsing aspect ratios', () => {
  for (const [ratio, resolution, width, height] of sizes) {
    assert.deepEqual(pickAtlasSize(ratio, resolution), { width, height }, `${ratio}/${resolution}`);
  }
  assert.deepEqual(pickAtlasSize(), { width: 1024, height: 1024 });
  for (const [ratio, resolution] of [['1:1', '4k'], ['3:4', '4k'], ['16:9', '8k'], ['bad', '1k'], ['4:1', '1k']]) {
    assert.equal(pickAtlasSize(ratio, resolution), undefined, `${ratio}/${resolution} is rejected`);
  }
});

test('resolution lookup matches exact provider dimensions and never guesses a tier', () => {
  assert.equal(typeof atlascloud.resolutionForAtlasSize, 'function');
  for (const [, resolution, width, height] of sizes) {
    assert.equal(atlascloud.resolutionForAtlasSize(width, height), resolution);
  }
  for (const [width, height] of [[1024, 864], [2048, 1365], [4096, 4096], [1024.1, 1024], [NaN, 1024], [0, 0]]) {
    assert.equal(atlascloud.resolutionForAtlasSize(width, height), null);
  }
});

test('size resolver rejects inherited keys and malformed resolution values', () => {
  for (const ratio of ['constructor', '__proto__', 'toString']) {
    assert.equal(pickAtlasSize(ratio, '1k'), undefined);
    assert.equal(pickAtlasSize(ratio, '2k'), undefined);
  }
  for (const ratio of [null, ['16:9'], { value: '16:9' }, 169]) {
    assert.equal(pickAtlasSize(ratio as unknown as string, '1k'), undefined);
  }
  for (const resolution of [null, '', 2048, { value: '2k' }, ['2k']]) {
    assert.equal(pickAtlasSize('1:1', resolution as unknown as string), undefined);
  }
});

test('AtlasCloud sends documented size independent of quality and preserves edit references', async () => {
  const original = globalThis.fetch;
  const requests: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return Response.json({ code: 200, data: { id: 'resolution-job', status: 'processing' } });
  };
  try {
    const provider = createAtlascloudProviderWithOptions({ baseUrl: 'https://api.atlascloud.ai', apiKey: 'test-key' });
    for (const resolution of ['1k', '2k', '4k'] as const) {
      await provider.create({ prompt: 'Watercolor lake', model: 'openai/gpt-image-2.6-sunburst/edit', aspectRatio: '16:9', resolution, quality: '2k', referenceImages: ['https://example.test/reference.png'] });
    }
    assert.deepEqual(requests.map(request => request.size), ['1536x864', '2048x1152', '3840x2160']);
    assert.ok(requests.every(request => request.quality === 'medium'));
    for (const request of requests) {
      assert.deepEqual(request.images, ['https://example.test/reference.png']);
      assert.equal(request.width, undefined);
      assert.equal(request.height, undefined);
      assert.equal(request.input, undefined);
    }
    await assert.rejects(provider.create({ prompt: 'Lake', aspectRatio: '1:1', resolution: '4k' }), /size|resolution/i);
    assert.equal(requests.length, 3, 'invalid dimensions never reach the provider');
  } finally { globalThis.fetch = original; }
});

test('AtlasCloud forwards image counts using n and preserves all polled outputs', async () => {
  const original = globalThis.fetch;
  const requests: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_url, init) => {
    if (init?.method === 'POST') {
      requests.push(JSON.parse(String(init.body)));
      return Response.json({ code: 200, data: { id: 'count-job', status: 'processing' } });
    }
    return Response.json({ code: 200, data: { id: 'count-job', status: 'completed', outputs: ['first.png', 'second.png', 'third.png', 'fourth.png'] } });
  };
  try {
    const provider = createAtlascloudProviderWithOptions({ baseUrl: 'https://api.atlascloud.ai', apiKey: 'test-key' });
    for (const count of [undefined, 2, 4, 10]) await provider.create({ prompt: 'Watercolor lake', count });
    assert.deepEqual(requests.map(request => request.n), [1, 2, 4, 10]);
    assert.ok(requests.every(request => request.count === undefined));
    const polled = await provider.poll('count-job');
    assert.equal(polled.status, 'succeeded');
    assert.deepEqual(polled.images, ['first.png', 'second.png', 'third.png', 'fourth.png']);
  } finally { globalThis.fetch = original; }
});

test('AtlasCloud rejects invalid counts before issuing a paid request', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return Response.json({ code: 200, data: { id: 'count-job', status: 'processing' } });
  };
  try {
    const provider = createAtlascloudProviderWithOptions({ baseUrl: 'https://api.atlascloud.ai', apiKey: 'test-key' });
    for (const count of [0, -1, 1.5, 11, Infinity, NaN, null, '2']) {
      await assert.rejects(provider.create({ prompt: 'Watercolor lake', count: count as unknown as number }), /count/i);
    }
    assert.equal(requests, 0);
  } finally { globalThis.fetch = original; }
});

test('actual dimensions determine resolution multipliers independently of quality', () => {
  const input = { model: 'GPT Image 2', path: 'text-to-image' as const, quality: '2k', count: 1 };
  for (const [width, height, credits] of [[1024, 1024, 6], [1536, 1024, 6], [2048, 2048, 12], [3840, 2160, 24], [2160, 3840, 24]]) {
    assert.equal(quoteImageCredits({ ...input, width, height })?.credits, credits);
    const decision = decideGeneration({ ...input, width, height, byok: false, ownerId: null, hasReference: false, now: Date.now() });
    assert.equal(decision.action, 'reject');
    if (decision.action === 'reject') {
      assert.equal(decision.error, 'no_identity');
      assert.equal(decision.credits, credits);
    }
    assert.equal(decideGeneration({ ...input, width, height, byok: true, ownerId: null, hasReference: false, now: Date.now() }).action, 'byok');
  }
  assert.equal(quoteImageCredits({ ...input, width: 4096, height: 4096 }), null);
});

test('history restores independent resolution and defaults old records without interpreting quality', () => {
  const entry = { id: 'history', prompt: 'Watercolor lake', createdAt: 1794000000000, quality: '4k', aspectRatio: '16:9' };
  assert.equal(parseHistory(JSON.stringify([entry]))[0].resolution, '1k');
  assert.equal(parseHistory(JSON.stringify([{ ...entry, resolution: '2k' }]))[0].resolution, '2k');
});
