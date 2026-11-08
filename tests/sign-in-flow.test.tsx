import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import {
  OpenPromptsSiteHeader,
  resolveHeaderAccountView,
} from '../src/components/open-prompts/OpenPromptsSiteHeader';
import type { AccountDisplaySnapshot } from '../src/lib/auth/account-snapshot';

const cachedAccount: AccountDisplaySnapshot = {
  version: 1,
  userId: 'cached-user',
  name: 'Cached User',
  email: 'cached@example.com',
  image: 'https://example.com/avatar.png',
  isAdmin: true,
  balance: 20,
  updatedAt: Date.now(),
};

test('loading header keeps a cached avatar without trusting cached admin access', () => {
  const view = resolveHeaderAccountView('loading', null, cachedAccount);
  assert.equal(view.showSignIn, false);
  assert.equal(view.showPlaceholder, false);
  assert.equal(view.user?.id, 'cached-user');
  assert.equal(view.canShowAdmin, false);
});

test('loading header without a cache reserves space instead of showing sign in', () => {
  const view = resolveHeaderAccountView('loading', null, null);
  assert.equal(view.showSignIn, false);
  assert.equal(view.showPlaceholder, true);
  assert.equal(view.user, null);
});

test('authenticated and signed-out headers follow the verified session', () => {
  const authenticated = resolveHeaderAccountView('authenticated', {
    id: 'live-user',
    name: 'Live User',
    email: 'live@example.com',
    image: null,
    isAdmin: true,
  }, cachedAccount);
  assert.equal(authenticated.user?.id, 'live-user');
  assert.equal(authenticated.canShowAdmin, true);
  assert.equal(authenticated.showSignIn, false);

  const signedOut = resolveHeaderAccountView('unauthenticated', null, cachedAccount);
  assert.equal(signedOut.user, null);
  assert.equal(signedOut.showSignIn, true);
  assert.equal(signedOut.canShowAdmin, false);
});

test('signed-out header keeps a login-page fallback before hydration', () => {
  const messages = JSON.parse(readFileSync('messages/en.json', 'utf8'));
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <SessionProvider session={null}>
        <OpenPromptsSiteHeader locale="en" activeNav="home" />
      </SessionProvider>
    </NextIntlClientProvider>,
  );

  assert.match(
    html,
    /<a[^>]+href="\/login"[^>]+aria-haspopup="dialog"[^>]*>Sign in<\/a>/,
  );
});

test('header does not show a sign-in action while the session is still loading', () => {
  const messages = JSON.parse(readFileSync('messages/en.json', 'utf8'));
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
      <SessionProvider>
        <OpenPromptsSiteHeader locale="en" activeNav="home" />
      </SessionProvider>
    </NextIntlClientProvider>,
  );

  assert.doesNotMatch(html, />Sign in<\/a>/);
});

test('the login fallback renders native provider forms with the popup styling', () => {
  const loginPage = readFileSync('src/app/[locale]/login/page.tsx', 'utf8');
  const authOptions = readFileSync('src/lib/auth/auth-options.ts', 'utf8');

  assert.match(loginPage, /\/api\/auth\/signin/);
  assert.match(loginPage, /action="\/api\/auth\/signin\/google"/);
  assert.match(loginPage, /action="\/api\/auth\/signin\/github"/);
  assert.match(loginPage, /next-auth\.csrf-token/);
  assert.match(authOptions, /signIn:\s*['"]\/login['"]/);
});
