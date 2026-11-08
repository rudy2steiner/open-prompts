import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { atlasUploadUrl, readUploadUrl, uploadFileError } from '../src/lib/generation/upload-media';

test('atlas upload url follows the same base shapes as generation', () => {
  assert.equal(atlasUploadUrl('https://api.atlascloud.ai'), 'https://api.atlascloud.ai/api/v1/model/uploadMedia');
  assert.equal(atlasUploadUrl('https://api.atlascloud.ai/api/'), 'https://api.atlascloud.ai/api/v1/model/uploadMedia');
  assert.equal(atlasUploadUrl('https://api.atlascloud.ai/api/v1/model'), 'https://api.atlascloud.ai/api/v1/model/uploadMedia');
});

test('upload response only accepts an https download url', () => {
  assert.equal(readUploadUrl({ data: { download_url: 'https://cdn.example/a.png' } }), 'https://cdn.example/a.png');
  assert.equal(readUploadUrl({ data: { url: 'https://cdn.example/b.png' } }), 'https://cdn.example/b.png');
  assert.equal(readUploadUrl({ data: { download_url: 'http://cdn.example/a.png' } }), null);
  assert.equal(readUploadUrl({}), null);
});

test('upload rejects non-images and files over 8 MB', () => {
  assert.equal(uploadFileError({ type: 'image/png', size: 12 }), null);
  assert.equal(uploadFileError({ type: 'text/plain', size: 12 }), 'type');
  assert.equal(uploadFileError({ type: 'image/jpeg', size: 8 * 1024 * 1024 + 1 }), 'size');
});
