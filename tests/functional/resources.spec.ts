import { test, expect } from '@playwright/test';
import { SITE } from '../config';
import { gotoHome, scrollThroughPage } from '../helpers';

test.describe('resources', () => {
  test('no broken images anywhere on the page', async ({ page }) => {
    await gotoHome(page);
    await scrollThroughPage(page);
    await page.waitForLoadState('networkidle');

    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src || '(no src)'),
    );
    expect(broken, `broken images: ${broken.join(', ')}`).toEqual([]);
  });

  test('no same-origin resource returns a 4xx/5xx or fails to load', async ({ page }) => {
    const badResponses: string[] = [];
    const origin = new URL(SITE.baseURL).origin;

    page.on('response', (res) => {
      if (res.url().startsWith(origin) && res.status() >= 400) {
        badResponses.push(`${res.status()} ${res.url()}`);
      }
    });
    page.on('requestfailed', (req) => {
      const failure = req.failure()?.errorText ?? '';
      // Aborted requests (e.g. cancelled by navigation) are not broken links.
      if (req.url().startsWith(origin) && !failure.includes('ERR_ABORTED')) {
        badResponses.push(`FAILED(${failure}) ${req.url()}`);
      }
    });

    await gotoHome(page);
    await scrollThroughPage(page);
    await page.waitForLoadState('networkidle');

    expect(badResponses, `broken resources:\n${badResponses.join('\n')}`).toEqual([]);
  });

  test('favicon is served', async ({ request }) => {
    const res = await request.get('favicon.svg');
    expect(res.status()).toBe(200);
  });
});
