const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const baseUrl = process.env.SITE_NAV_TEST_BASE_URL || 'http://localhost:3210';

for (const destination of ['pricing', 'motion-prompts']) {
  test(`slow navigation to ${destination} keeps the current document and shows pending feedback`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(10_000);

    try {
      await page.goto(`${baseUrl}/zh/image-prompts`, { waitUntil: 'domcontentloaded' });
      await page.locator(`header a[href='/zh/${destination}']`).first().waitFor();
      await page.evaluate(() => {
        window.__openPromptsNavigationProbe = 'preserved';
      });

      await page.route(`**/zh/${destination}*`, async route => {
        if (route.request().resourceType() === 'document') return route.continue();
        await new Promise(resolve => setTimeout(resolve, 1200));
        return route.continue();
      });

      await page.locator(`header a[href='/zh/${destination}']`).first().click();
      await page.locator('[data-nav-pending="true"]').waitFor({ state: 'visible' });
      await page.waitForURL(`**/zh/${destination}`);

      assert.equal(await page.evaluate(() => window.__openPromptsNavigationProbe), 'preserved');
      assert.notEqual(await page.locator('body').innerText(), '');
    } finally {
      await browser.close();
    }
  });
}

test('header navigation stays on the visible page until hydration is available', async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.route('**/_next/static/chunks/**', route => route.abort());
    await page.goto(`${baseUrl}/zh/image-prompts`, { waitUntil: 'domcontentloaded' });

    const pricing = page.locator("header a[href='/zh/pricing']").first();
    await pricing.dispatchEvent('click', { button: 0 });
    await page.waitForTimeout(300);

    assert.equal(page.url(), `${baseUrl}/zh/image-prompts`);
    assert.equal(await pricing.getAttribute('aria-busy'), 'true');
    assert.notEqual(await page.locator('body').innerText(), '');
  } finally {
    await browser.close();
  }
});
