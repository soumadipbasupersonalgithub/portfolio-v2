import { test, expect } from '@playwright/test';
import { gotoHome } from '../helpers';

test.describe('section content', () => {
  test('hero stats render', async ({ page }) => {
    await gotoHome(page);
    const stats = page.locator('.hero-stat');
    await expect(stats.first()).toBeVisible();
    expect(await stats.count()).toBeGreaterThanOrEqual(3);
  });

  test('skills section renders skill cards', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#skills').scrollIntoViewIfNeeded();
    const cards = page.locator('#skills .skill-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('work section renders experience entries', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#work').scrollIntoViewIfNeeded();
    const entries = page.locator('#work .exp');
    await expect(entries.first()).toBeVisible();
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('projects section renders cards and category filters work', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#projects').scrollIntoViewIfNeeded();

    const cards = page.locator('#projects .project-card');
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total).toBeGreaterThan(0);

    // Click a non-"all" filter chip: only cards of that category stay visible.
    const chips = page.locator('#projects [data-filter]');
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThan(1);

    const someChip = chips.nth(1);
    const filter = await someChip.getAttribute('data-filter');
    await someChip.click();
    await expect(someChip).toHaveClass(/active/);

    const visibleAfter = await page
      .locator(`#projects .project-card[data-cat="${filter}"]`)
      .count();
    const shownCards = page.locator('#projects .project-card:visible');
    await expect(shownCards).toHaveCount(visibleAfter);

    // Back to "all" restores everything.
    await page.locator('#projects [data-filter="all"]').click();
    await expect(page.locator('#projects .project-card:visible')).toHaveCount(total);
  });

  test('project details modal opens and closes', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#projects').scrollIntoViewIfNeeded();

    const firstLink = page.locator('.project-link[data-project]').first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();

    const modal = page.locator('#projectModal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.project-detail-title')).not.toBeEmpty();

    await modal.locator('.modal-close').click();
    await expect(modal).not.toHaveClass(/show/);
    await expect(modal).toBeHidden();
  });

  test('certifications section renders certificate cards', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#certifications').scrollIntoViewIfNeeded();
    const cards = page.locator('#certifications .cert-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('contact form renders all fields with validation attributes', async ({ page }) => {
    await gotoHome(page);
    await page.locator('section#contact').scrollIntoViewIfNeeded();

    const form = page.locator('#contact-form');
    await expect(form).toBeVisible();
    for (const field of ['#name', '#email', '#message']) {
      await expect(form.locator(field)).toBeVisible();
      await expect(form.locator(field)).toHaveAttribute('required', '');
    }
    await expect(form.locator('#email')).toHaveAttribute('type', 'email');
    await expect(form.locator('button[type="submit"]')).toBeEnabled();
  });

  test('contact form submits successfully (Web3Forms mocked)', async ({ page }) => {
    // Hermetic: intercept the Web3Forms API so no real network call or key
    // is needed — this tests the app's own submit flow end to end.
    await page.route('https://api.web3forms.com/submit', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      }),
    );

    await gotoHome(page);
    await page.locator('section#contact').scrollIntoViewIfNeeded();

    await page.locator('#contact-form #name').fill('CI Test User');
    await page.locator('#contact-form #email').fill('ci-test@example.com');
    await page.locator('#contact-form #message').fill('Automated pipeline test message.');
    await page.locator('#contact-form button[type="submit"]').click();

    await expect(page.locator('#form-status')).toContainText(/sent successfully/i);
    // Successful submit resets the form.
    await expect(page.locator('#contact-form #name')).toHaveValue('');
  });

  test('contact form shows an error when the API rejects (mocked)', async ({ page }) => {
    await page.route('https://api.web3forms.com/submit', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid access key' }),
      }),
    );

    await gotoHome(page);
    await page.locator('section#contact').scrollIntoViewIfNeeded();

    await page.locator('#contact-form #name').fill('CI Test User');
    await page.locator('#contact-form #email').fill('ci-test@example.com');
    await page.locator('#contact-form #message').fill('Automated pipeline test message.');
    await page.locator('#contact-form button[type="submit"]').click();

    await expect(page.locator('#form-status')).toContainText(/failed to send/i);
  });

  test('AI chatbot window opens and closes', async ({ page }) => {
    await gotoHome(page);
    await page.locator('#chatbotFab').click();
    await expect(page.locator('#chatbotWindow')).toHaveClass(/open/);
    await expect(page.locator('.chatbot-welcome-title')).toBeVisible();
    await page.locator('#chatbotClose').click();
    await expect(page.locator('#chatbotWindow')).not.toHaveClass(/open/);
  });
});
