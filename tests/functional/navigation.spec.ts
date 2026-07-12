import { test, expect } from '@playwright/test';
import { NAV_LINKS } from '../config';
import { gotoHome, openNavMenuIfCollapsed } from '../helpers';

test.describe('navigation', () => {
  test('every nav link points at a section that exists', async ({ page }) => {
    await gotoHome(page);
    for (const target of NAV_LINKS) {
      const link = page.locator(`.nav-link[data-nav="${target}"]`);
      await expect(link, `nav link for "${target}" missing`).toBeAttached();
      await expect(link).toHaveAttribute('href', `#${target}`);
      await expect(page.locator(`section#${target}`)).toBeAttached();
    }
  });

  for (const target of NAV_LINKS) {
    test(`clicking nav link "${target}" scrolls its section into view`, async ({ page }) => {
      await gotoHome(page);
      await openNavMenuIfCollapsed(page);
      await page.locator(`.nav-link[data-nav="${target}"]`).click();
      // Smooth scroll + the nav's 150ms close-menu delay.
      await expect(page.locator(`section#${target}`)).toBeInViewport({
        ratio: 0.1,
        timeout: 10_000,
      });
    });
  }

  test('every in-page anchor href resolves to an existing element', async ({ page }) => {
    await gotoHome(page);
    const anchors = await page
      .locator('a[href^="#"]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('href')!).filter((h) => h.length > 1),
      );
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      await expect(
        page.locator(href),
        `anchor target ${href} does not exist`,
      ).toBeAttached();
    }
  });

  test('brand link returns to the hero from deep in the page', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#contact').scrollIntoViewIfNeeded();
    await page.locator('.nav-brand').click();
    await expect(page.locator('section#home')).toBeInViewport({ ratio: 0.3, timeout: 10_000 });
  });

  test('footer back-to-top link works', async ({ page }) => {
    await gotoHome(page);
    await page.locator('.footer-top').scrollIntoViewIfNeeded();
    await page.locator('.footer-top').click();
    await expect(page.locator('section#home')).toBeInViewport({ ratio: 0.3, timeout: 10_000 });
  });

  test('hamburger toggles the menu on small viewports', async ({ page }) => {
    await gotoHome(page);
    const hamburger = page.locator('#hamburger');
    test.skip(!(await hamburger.isVisible()), 'hamburger not shown at this viewport');
    await hamburger.click();
    await expect(page.locator('#navMenu')).toHaveClass(/active/);
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    await hamburger.click();
    await expect(page.locator('#navMenu')).not.toHaveClass(/active/);
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  test('theme toggle flips the data-theme attribute', async ({ page }) => {
    await gotoHome(page);
    const toggle = page.locator('#themeToggle');
    test.skip(!(await toggle.isVisible()), 'theme toggle not shown at this viewport');
    const before = await page.locator('html').getAttribute('data-theme');
    await toggle.click();
    const flipped = before === 'dark' ? 'light' : 'dark';
    await expect(page.locator('html')).toHaveAttribute('data-theme', flipped);
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', before!);
  });
});
