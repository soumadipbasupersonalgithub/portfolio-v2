import { test, expect } from '@playwright/test';
import { gotoHome, scrollThroughPage } from '../helpers';

/**
 * Visual regression per viewport. Baselines live in
 * tests/visual/__screenshots__/<project>/<platform>/ — the gating ones are
 * generated on Linux (CI's platform); see README §Visual baselines.
 *
 * Determinism: screenshot.css (wired up as expect.toHaveScreenshot.stylePath
 * in playwright.config.ts) freezes the hero's time-varying elements during
 * capture, and `animations: 'disabled'` handles CSS animations. Sections are
 * scrolled with plain DOM scrollIntoView because Playwright's own scrolling
 * waits for box stability, which JS-driven animations never reach.
 */
async function scrollTo(page: import('@playwright/test').Page, selector: string) {
  await page
    .locator(selector)
    .evaluate((el) => el.scrollIntoView({ block: 'start' }));
}

/**
 * One element screenshot per section (rather than a single full-page shot):
 * the page's fractional line-heights put the total document height on a
 * half-pixel, so full-page capture height flaps by 1px between captures — a
 * hard size-mismatch failure no diff tolerance can absorb. Element shots are
 * stable and localize failures to the section that actually changed.
 */
const SECTION_SHOTS: Array<[name: string, selector: string]> = [
  ['hero', 'section#home'],
  ['about', 'section#about'],
  ['skills', 'section#skills'],
  ['work', 'section#work'],
  ['projects', 'section#projects'],
  ['certifications', 'section#certifications'],
  ['contact', 'section#contact'],
  ['footer', 'footer.footer'],
];

test.describe('visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHome(page);
    // Force every webfont face to be fetched AND active before capturing:
    // fonts.ready alone can resolve before remote faces activate (WebKit),
    // and fallback-font metrics change section heights by a pixel or two.
    await page.evaluate(async () => {
      const faces = ['300', '400', '500', '600', '700'].flatMap((w) => [
        `${w} 16px "Space Grotesk"`,
        `${w} 16px "JetBrains Mono"`,
      ]);
      await Promise.all(faces.map((f) => document.fonts.load(f)));
      await document.fonts.ready;
    });
    // The timeline measures its expanded panel height (scrollHeight → inline
    // max-height) at init, i.e. possibly pre-font-activation. It re-measures
    // on resize, so trigger that now that fonts are final.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await scrollThroughPage(page);
  });

  for (const [name, selector] of SECTION_SHOTS) {
    test(`${name} section`, async ({ page }) => {
      await scrollTo(page, selector);
      // Generous timeout: WebKit needs two consecutive stable captures of a
      // large element, which exceeds the default 5s under parallel load.
      await expect(page.locator(selector)).toHaveScreenshot(`${name}.png`, {
        timeout: 15_000,
      });
    });
  }
});
