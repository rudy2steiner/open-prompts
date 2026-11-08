import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { imageDownloadFilename } from '../src/lib/billing/download';

test('download filename uses the real image format', () => {
  assert.equal(imageDownloadFilename('0', 'image/png', 'https://cdn.example.com/a'), 'generation-0.png');
  assert.equal(imageDownloadFilename('1', 'image/jpeg; charset=binary', 'https://cdn.example.com/a'), 'generation-1.jpg');
  assert.equal(imageDownloadFilename('2', 'image/webp', 'https://cdn.example.com/a'), 'generation-2.webp');
});

test('download filename falls back to the url extension when the type is generic', () => {
  assert.equal(imageDownloadFilename('0', 'application/octet-stream', 'https://cdn.example.com/out.PNG?sig=1'), 'generation-0.png');
  assert.equal(imageDownloadFilename('0', null, 'https://cdn.example.com/out'), 'generation-0.png');
});
