import { test, expect } from '@playwright/test';
import { gotoHome, scrollThroughPage, trackConsoleErrors, unexpectedErrors } from '../helpers';

test.describe('console hygiene', () => {
  test('no console errors or uncaught exceptions on load and full scroll', async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await gotoHome(page);
    await scrollThroughPage(page);
    await page.waitForLoadState('networkidle');

    const unexpected = unexpectedErrors(errors);
    expect(unexpected, `console errors:\n${unexpected.join('\n')}`).toEqual([]);
  });

  test('no console errors while interacting with nav, theme, and modal', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await gotoHome(page);

    // Theme toggle (when visible at this viewport).
    const toggle = page.locator('#themeToggle');
    if (await toggle.isVisible()) {
      await toggle.click();
      await toggle.click();
    }

    // Project modal open/close.
    await page.locator('section#projects').scrollIntoViewIfNeeded();
    const firstLink = page.locator('.project-link[data-project]').first();
    if (await firstLink.isVisible()) {
      await firstLink.click();
      await expect(page.locator('#projectModal')).toHaveClass(/show/);
      await page.keyboard.press('Escape');
      await expect(page.locator('#projectModal')).not.toHaveClass(/show/);
    }

    // Chatbot open/close (no message sent — that would need a live API).
    await page.locator('#chatbotFab').click();
    await expect(page.locator('#chatbotWindow')).toHaveClass(/open/);
    await page.locator('#chatbotClose').click();

    const unexpected = unexpectedErrors(errors);
    expect(unexpected, `console errors:\n${unexpected.join('\n')}`).toEqual([]);
  });
});
