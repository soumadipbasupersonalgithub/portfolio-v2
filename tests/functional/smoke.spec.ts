import { test, expect } from '@playwright/test';
import { SECTIONS } from '../config';
import { gotoHome, scrollThroughPage } from '../helpers';

test.describe('smoke', () => {
  test('page loads successfully with the expected title', async ({ page }) => {
    const response = await gotoHome(page);
    expect(response, 'navigation should produce a response').toBeTruthy();
    expect(response!.ok(), `HTTP status was ${response!.status()}`).toBeTruthy();
    await expect(page).toHaveTitle(/soumadip/i);
  });

  test('hero renders name, subtitle, and CTA buttons', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('.hero-title')).toContainText(/Soumadip/);
    await expect(page.locator('.hero-sub')).toContainText(/QA/);
    await expect(page.locator('.hero-buttons .btn-primary')).toBeVisible();
    await expect(page.locator('.hero-buttons .btn-secondary')).toBeVisible();
  });

  test('all key sections exist and become visible when scrolled to', async ({ page }) => {
    await gotoHome(page);
    for (const id of SECTIONS) {
      const section = page.locator(`section#${id}`);
      await expect(section, `section #${id} missing from DOM`).toBeAttached();
      // Plain DOM scrollIntoView: some sections animate continuously (hero
      // float), which scrollIntoViewIfNeeded would wait on forever.
      await section.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await expect(section, `section #${id} not visible`).toBeVisible();
    }
  });

  test('footer renders after scrolling through the page', async ({ page }) => {
    await gotoHome(page);
    await scrollThroughPage(page);
    await expect(page.locator('.footer-copy')).toContainText(/Soumadip Basu/);
  });
});
