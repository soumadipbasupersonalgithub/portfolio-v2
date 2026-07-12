/**
 * Lighthouse CI configuration.
 *
 * Runs against the locally served build (never the live site) — start it
 * with `npm run serve` first, or let the Jenkins pipeline do it.
 *
 * Thresholds are deliberately conservative to start; tighten them once the
 * pipeline has been green for a while. Scores are 0–1 (0.85 = 85).
 */
const THRESHOLDS = {
  performance: 0.85,
  accessibility: 0.9,
  'best-practices': 0.9,
  seo: 0.9,
};

const TARGET_URL = process.env.LHCI_URL || 'http://127.0.0.1:4173/portfolio-v2/';

module.exports = {
  ci: {
    collect: {
      url: [TARGET_URL],
      numberOfRuns: 3, // median of 3 runs smooths out noise
      settings: {
        // CHROME_PATH env var (set by the Jenkins pipeline to Playwright's
        // Chromium) takes precedence; locally your installed Chrome is found.
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: THRESHOLDS.performance }],
        'categories:accessibility': ['error', { minScore: THRESHOLDS.accessibility }],
        'categories:best-practices': ['error', { minScore: THRESHOLDS['best-practices'] }],
        'categories:seo': ['error', { minScore: THRESHOLDS.seo }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'lhci-report',
    },
  },
};
