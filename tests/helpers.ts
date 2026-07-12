import { expect, type Page } from '@playwright/test';
import { CONSOLE_ERROR_ALLOWLIST } from './config';

/**
 * Navigate to the site root. Uses '.' (not '/') so the URL stays under the
 * Vite base path (/portfolio-v2/) that baseURL ends with.
 *
 * Also pins the two hero elements whose JS animations change their BOX SIZE
 * over time (simulated test console appends rows; typing loop rewraps lines).
 * Without this, everything below the hero shifts every ~600ms and Playwright
 * click/scroll actionability ("element is not stable") times out under load.
 * Values match tests/visual/screenshot.css so visual baselines agree.
 */
export async function gotoHome(page: Page) {
  const response = await page.goto('.', { waitUntil: 'load' });
  await expect(page.locator('#navbar')).toBeVisible();
  await page.addStyleTag({
    content:
      '#runBody{height:104px !important;overflow:hidden !important}' +
      '.hero-whoami{height:7em !important;overflow:hidden !important}',
  });
  return response;
}

/**
 * Start collecting console errors and uncaught exceptions. Call before
 * navigation; read the returned array at the end of the test.
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`Uncaught exception: ${err.message}`));
  return errors;
}

/** Drop errors matched by the allowlist in tests/config.ts. */
export function unexpectedErrors(errors: string[]): string[] {
  return errors.filter((e) => !CONSOLE_ERROR_ALLOWLIST.some((rx) => rx.test(e)));
}

/**
 * Scroll from top to bottom in half-viewport steps so IntersectionObserver
 * reveals, counters, and lazy work all trigger, then return to the top.
 */
export async function scrollThroughPage(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight / 2));
    const bottom = document.documentElement.scrollHeight;
    for (let y = 0; y <= bottom; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

/**
 * On small viewports the nav menu is behind the hamburger. Opens it if
 * needed; no-op on desktop where the menu is always visible.
 */
export async function openNavMenuIfCollapsed(page: Page) {
  const hamburger = page.locator('#hamburger');
  if (await hamburger.isVisible()) {
    const alreadyOpen = await page
      .locator('#navMenu')
      .evaluate((el) => el.classList.contains('active'));
    if (!alreadyOpen) {
      await hamburger.click();
      await expect(page.locator('#navMenu')).toHaveClass(/active/);
    }
  }
}
