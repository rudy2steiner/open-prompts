import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import { PricingPlans } from '../src/components/billing/PricingPlans';

test('monthly pricing tab advertises the subscription savings', () => {
  const messages = JSON.parse(readFileSync('messages/en.json', 'utf8'));
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <SessionProvider session={null}>
        <PricingPlans locale="en" />
      </SessionProvider>
    </NextIntlClientProvider>,
  );

  const monthlyTab = Array.from(html.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g))
    .map((match) => match[0])
    .find((button) => button.includes('Monthly'));
  assert.ok(monthlyTab);
  assert.match(monthlyTab, /Save 20%/);
});
