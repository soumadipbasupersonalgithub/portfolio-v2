/**
 * Central test configuration — single place to tweak viewports, thresholds,
 * URLs, and expected content. Everything in tests/ and playwright.config.ts
 * reads from here.
 */

/** Where the site under test is served. The Vite `base` is /portfolio-v2/,
 *  so the served URL includes it (same as production GitHub Pages). */
export const SITE = {
  port: 4173,
  basePath: '/portfolio-v2/',
  baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4173/portfolio-v2/',
};

/** Viewport matrix. `device` names must be Playwright built-in descriptors;
 *  `viewport` (if set) overrides the descriptor's size. */
export const VIEWPORTS = {
  desktop: { device: 'Desktop Chrome', viewport: { width: 1920, height: 1080 } },
  tablet: { device: 'iPad Pro 11' }, // 834×1194, WebKit, touch
  mobile: { device: 'Pixel 7' }, // 412×915, Chromium, touch
} as const;

/** Visual regression tolerance: fraction of pixels allowed to differ
 *  before a screenshot comparison fails. */
export const VISUAL = {
  maxDiffPixelRatio: 0.02,
};

/** Section ids that must exist and render (order matches the page). */
export const SECTIONS = [
  'home',
  'about',
  'skills',
  'work',
  'projects',
  'certifications',
  'contact',
] as const;

/** Nav menu links: data-nav attribute → target section id. */
export const NAV_LINKS = [
  'about',
  'skills',
  'work',
  'projects',
  'certifications',
  'contact',
] as const;

/** External / social links that must have exactly these hrefs. */
export const EXPECTED_LINKS = {
  linkedin: 'https://www.linkedin.com/in/soumadip-basu-b47160197/',
  github: 'https://github.com/soumadipbasupersonalgithub',
  email: 'mailto:soumadipbasu333@gmail.com',
  phone: 'tel:+919851824880',
  resume: 'soumadip_basu_cv.pdf',
};

/**
 * Console errors that are tolerated (matched against the message text).
 * Keep this list as small as possible — every entry is a blind spot.
 * Third-party fonts/CDNs can be flaky in CI, so failures to *fetch* external
 * resources are excluded; app-code errors are never excluded.
 */
export const CONSOLE_ERROR_ALLOWLIST: RegExp[] = [
  /net::ERR_(NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|CONNECTION_)/i, // offline CI / DNS blips
  /fonts\.(googleapis|gstatic)\.com/i, // Google Fonts fetch hiccups
];
