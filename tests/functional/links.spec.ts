import { test, expect } from '@playwright/test';
import { EXPECTED_LINKS } from '../config';
import { gotoHome } from '../helpers';

test.describe('links', () => {
  test('social links have the exact expected hrefs', async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('#linkedin-link')).toHaveAttribute('href', EXPECTED_LINKS.linkedin);
    await expect(page.locator('#github-link')).toHaveAttribute('href', EXPECTED_LINKS.github);
  });

  test('email and phone links are correct', async ({ page }) => {
    await gotoHome(page);
    const emailLinks = page.locator(`a[href="${EXPECTED_LINKS.email}"]`);
    expect(await emailLinks.count(), 'no mailto link found').toBeGreaterThan(0);
    const phoneLinks = page.locator(`a[href="${EXPECTED_LINKS.phone}"]`);
    expect(await phoneLinks.count(), 'no tel link found').toBeGreaterThan(0);
  });

  test('all external links open in a new tab with noopener', async ({ page }) => {
    await gotoHome(page);
    const external = await page
      .locator('a[href^="http"]')
      .evaluateAll((els) =>
        els.map((el) => ({
          href: el.getAttribute('href'),
          target: el.getAttribute('target'),
          rel: el.getAttribute('rel') ?? '',
        })),
      );
    expect(external.length).toBeGreaterThan(0);
    for (const link of external) {
      expect.soft(link.target, `${link.href} should open in a new tab`).toBe('_blank');
      expect.soft(link.rel, `${link.href} should have rel=noopener`).toContain('noopener');
    }
  });

  test('resume links point at the CV and the file is downloadable', async ({ page, request }) => {
    await gotoHome(page);
    const resumeLinks = page.locator(`a[href*="${EXPECTED_LINKS.resume}"]`);
    expect(await resumeLinks.count(), 'no resume link found').toBeGreaterThan(0);

    // The CV itself must be served (no broken download).
    const res = await request.get(EXPECTED_LINKS.resume);
    expect(res.status(), 'CV pdf should be served').toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
  });
});
