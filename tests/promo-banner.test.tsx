import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { PromoBanner } from '../src/components/site/PromoBanner';

test('promo banner stays absent when no announcement is configured', () => {
  assert.equal(renderToStaticMarkup(<PromoBanner text="   " />), '');
});

test('promo banner renders a plain site-wide announcement', () => {
  const html = renderToStaticMarkup(<PromoBanner text="New image editor is live" />);
  assert.match(html, /role="status"/);
  assert.match(html, /New image editor is live/);
  assert.doesNotMatch(html, /<a /);
});

test('promo banner links promotions and feature launches to their destination', () => {
  const html = renderToStaticMarkup(<PromoBanner text="Launch offer" href="/pricing" />);
  assert.match(html, /<a[^>]+href="\/pricing"/);
  assert.match(html, /Launch offer/);
});
